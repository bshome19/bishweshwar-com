---
title: "Multi-Tier Failover in Distributed Rate Limiting Systems"
description: "Designing zero-downtime distributed rate limiters: handling Redis cluster network partitions, graceful degradation to sharded memory, and consensus recovery."
pubDate: 2024-05-18
category: "distributed-systems"
tags: ["distributed-systems", "fault-tolerance", "redis", "concurrency", "go", "high-availability"]
featured: true
canonicalUrl: "https://bishweshwar.com/blog/multi-tier-failover-distributed-rate-limiting"
readingTime: "7 min read"
---

In distributed architectures, rate limiters are critical to maintaining service level objectives (SLOs) and guarding backend microservices from overload. The standard industry pattern deploys rate limiting middleware backed by a shared distributed cache, most commonly **Redis**.

However, relying strictly on a central Redis cluster creates a single point of operational risk:

- What occurs during a Redis cluster node failover or network partition?
- What happens if transient network jitter spikes round-trip latency from 1ms to 250ms?
- If the store becomes unreachable, should the gateway **fail open** (admitting traffic) or **fail closed** (rejecting all requests)?

In mission-critical infrastructure, neither extreme is acceptable. Failing open leaves databases vulnerable to catastrophic cascades, while failing closed turns a cache hiccup into a total customer-facing outage.

In this article, we analyze the design of **multi-tier failover architectures** that provide graceful degradation and self-healing recovery.

---

## 1. The Fallback Topology

To guarantee high availability without sacrificing rate-limiting safety, we employ a multi-tier storage hierarchy:

```
                  ┌───────────────────────────────┐
                  │      Incoming API Request     │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │    Tier 1: Primary Redis      │
                  │    (Atomic Distributed Lua)   │
                  └───────┬───────────────┬───────┘
                          │ OK            │ Timeout / Partition
                          ▼               ▼
                   [Apply Global   ┌───────────────────────────────┐
                     Quotas]       │    Tier 2: Sharded In-Memory  │
                                   │    (64-Shard Local Mutex)     │
                                   └──────────────┬────────────────┘
                                                  │
                                                  ▼
                                           [Apply Local Partition
                                               Quota (Q/N)]
```

### Tier 1: Distributed Global Enforcement
When Redis is healthy, all gateway nodes coordinate via atomic Lua scripts to enforce accurate, cross-cluster rate quotas.

### Tier 2: Localized In-Memory Partition Guard
When Tier 1 experiences connection timeouts, errors, or circuit breaker trips, the node transitions seamlessly to an in-process sharded memory engine. Each gateway node enforces an allocated slice of the total budget $Q / N$ (where $Q$ is the global limit and $N$ is the number of active gateway instances).

---

## 2. Circuit Breakers & Health Probing

Naive fallback logic that attempts Redis on every single request during an outage will incur timeout penalties on every thread, rapidly exhausting goroutine pools.

Instead, we wrap the primary store with an adaptive **Circuit Breaker**:

1. **Closed State (Normal)**: All operations target Redis. Error counters are tracked in rolling time windows.
2. **Open State (Tripped)**: When failure percentage exceeds threshold (e.g. 5% timeouts over 5 seconds), the circuit trips. Redis is bypassed entirely, and all traffic immediately routes to local memory without network latency.
3. **Half-Open State (Probing)**: After a cooldown interval (e.g. 10 seconds), a small canary percentage of requests are dispatched to Redis. If canary requests succeed, the breaker resets to Closed; if they fail, the timer resets.

```go
type FallbackStore struct {
    primary   Store
    secondary Store
    breaker   *circuitbreaker.Breaker
    onError   func(err error)
}

func (s *FallbackStore) Allow(ctx context.Context, key string, count int64) (Result, error) {
    if s.breaker.Allow() {
        res, err := s.primary.Allow(ctx, key, count)
        if err == nil {
            s.breaker.Success()
            return res, nil
        }
        s.breaker.Failure()
        if s.onError != nil {
            s.onError(err)
        }
    }

    // Gracefully degrade to Tier 2 local memory store
    return s.secondary.Allow(ctx, key, count)
}
```

---

## 3. Dynamic Quota Apportionment ($Q / N$)

When degrading from global Redis to local memory, enforcing the original global quota $Q$ locally on every node could permit up to $N \times Q$ total requests across $N$ instances.

To maintain cluster-wide protection during a partition:
- Nodes track the active cluster size $N$ via heartbeats or service discovery.
- The local fallback limit is scaled down to:
  
  $$L_{\text{local}} = \max\left(1, \left\lfloor \frac{Q}{N} \cdot \delta \right\rfloor\right)$$

  where $\delta \ge 1.0$ is an optional tolerance factor (e.g. $1.15$) to absorb minor load imbalance across nodes.

---

## 4. State Synchronization on Recovery

When Redis recovers and the circuit breaker transitions back to Closed:
- Do not flush or wipe local memory abruptly; let key TTLs expire naturally.
- Increment the primary store by the local consumption delta if exact audit compliance is mandatory, or allow standard sliding window decay to smooth out the transition boundary.

---

## Conclusion

Resilience is not the absence of failure, but the architectural ability to gracefully degrade when failure inevitably occurs. By combining centralized atomic coordination with decentralized sharded fallbacks, distributed systems achieve the gold standard: **maximum protection in the happy path, zero downtime in the catastrophic path.**
