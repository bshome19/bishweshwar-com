---
id: mc-rate-limiter-engine
title: "Machine Coding Case Study: Multi-Strategy Rate Limiter Engine"
track: machine-coding
module: case-studies
level: advanced
duration: 45
prerequisites: [lld-five-step-framework, pattern-strategy]
concepts: [rate-limiter, token-bucket, fixed-window, sliding-window-log, leaky-bucket, concurrency, atomic-operations]
tags: [machine-coding, lld, rate-limiter, algorithms, redis]
interactive:
  type: rate-limiter
  enabled: true
order: 4
---

# Machine Coding: Multi-Strategy Rate Limiter Engine

Rate limiters protect servers from denial-of-service attacks, brute-force credential stuffing, API abuse, and cascading overload.

In machine coding interviews, you are expected to design an extensible rate-limiting framework supporting multiple swappable algorithms (Token Bucket, Fixed Window, Sliding Window Log) with thread-safe client tracking.

---

## 1. Algorithm Comparison

| Algorithm | Memory per Client | Burst Handling | Accuracy | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Token Bucket** | $O(1)$ (2 numbers) | Allows controlled bursts up to bucket capacity | High | General API Gateways, Stripe, AWS |
| **Fixed Window** | $O(1)$ (1 counter) | Double-burst hazard at window boundaries | Low | Simple hourly limits |
| **Sliding Window Log** | $O(N)$ (Timestamps) | Perfectly smooth, zero boundary anomalies | 100% Exact | High-security financial endpoints |
| **Leaky Bucket** | $O(1)$ (Queue size) | Smooths traffic to strictly constant egress rate| High | Ingest pipelines, message brokers |

---

## 2. Core Architecture: Strategy Pattern

```
                       ┌───────────────────────────────┐
                       │     <<interface>>             │
                       │     RateLimiterStrategy       │
                       ├───────────────────────────────┤
                       │ + allowRequest(clientId): bool│
                       └───────────────▲───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│ TokenBucketLimiter      │  │ FixedWindowLimiter      │  │ SlidingWindowLogLimiter │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

---

## 3. High-Performance Token Bucket Implementation

The **Token Bucket** algorithm allows short bursts of traffic while enforcing a smooth long-term average rate:
- A bucket holds at most `capacity` tokens.
- Tokens are refilled at a constant rate of `refillRatePerSecond`.
- Every incoming request consumes 1 token. If tokens $>0$, request is admitted; else rejected.

### The Lazy Refill Optimization
Instead of running a background timer to add tokens every millisecond (which would burn CPU for millions of idle users), calculate token refill **lazily** on each incoming request:

```java
public class TokenBucketLimiter implements RateLimiterStrategy {
    private final long capacity;
    private final double refillRatePerSecond;

    // Thread-safe state container per client
    private static class Bucket {
        double tokens;
        long lastRefillTimestamp;

        Bucket(long capacity) {
            this.tokens = capacity;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }
    }

    private final ConcurrentMap<String, Bucket> clientBuckets = new ConcurrentHashMap<>();

    public TokenBucketLimiter(long capacity, double refillRatePerSecond) {
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
    }

    @Override
    public boolean allowRequest(String clientId) {
        Bucket bucket = clientBuckets.computeIfAbsent(clientId, k -> new Bucket(capacity));

        synchronized (bucket) {
            long now = System.currentTimeMillis();
            double secondsPassed = (now - bucket.lastRefillTimestamp) / 1000.0;

            // Refill tokens proportional to elapsed time
            bucket.tokens = Math.min(capacity, bucket.tokens + (secondsPassed * refillRatePerSecond));
            bucket.lastRefillTimestamp = now;

            if (bucket.tokens >= 1.0) {
                bucket.tokens -= 1.0;
                return true; // Allowed!
            }
            return false; // Throttled! HTTP 429
        }
    }
}
```

---

## 4. Sliding Window Log: 100% Boundary Accuracy

The Sliding Window Log maintains a sorted set or queue of request timestamps for each client:

```java
public class SlidingWindowLogLimiter implements RateLimiterStrategy {
    private final int maxRequests;
    private final long windowSizeMillis;
    private final ConcurrentMap<String, Queue<Long>> clientLogs = new ConcurrentHashMap<>();

    @Override
    public boolean allowRequest(String clientId) {
        Queue<Long> log = clientLogs.computeIfAbsent(clientId, k -> new LinkedList<>());

        synchronized (log) {
            long now = System.currentTimeMillis();
            long windowStart = now - windowSizeMillis;

            // Purge all timestamps older than window boundary
            while (!log.isEmpty() && log.peek() <= windowStart) {
                log.poll();
            }

            if (log.size() < maxRequests) {
                log.offer(now);
                return true;
            }
            return false;
        }
    }
}
```

---

## Interactive Rate Limiter Simulator

Test your understanding using the **Rate Limiter Engine Simulator** above:
1. Fire burst traffic across Token Bucket, Fixed Window, and Sliding Window Log algorithms.
2. Observe how the Fixed Window allows double the configured rate right at the boundary crossover!
3. Compare memory consumption differences across high concurrency.
