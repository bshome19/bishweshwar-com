---
id: reliability-bulkheads-and-load-shedding
title: "Bulkheads and Adaptive Load Shedding: Surviving Massive Overload"
track: reliability
module: resilience-patterns
level: advanced
duration: 25
prerequisites: [reliability-circuit-breakers-and-retries]
concepts: [bulkheads, load-shedding, thread-pool-isolation, graceful-degradation, little-law]
tags: [reliability, resilience, load-shedding, bulkheads, high-scale]
order: 2
---

# Bulkheads and Adaptive Load Shedding

What happens when an unexpected traffic surge hits your service at 10x normal peak volume?

A naive service attempts to process every incoming request. As queues grow and CPU nears 100%, latency skyrockets from 20ms to 15 seconds. Requests begin timing out before completing, meaning the server is burning 100% CPU on computations that will ultimately be discarded by the client. **The throughput of useful work drops to zero.**

To survive catastrophic load, resilient systems employ **Bulkhead Isolation** and **Load Shedding**.

---

## 1. The Bulkhead Pattern: Containing the Blast Radius

In shipbuilding, a **bulkhead** is a watertight partition dividing the hull into isolated compartments. If one compartment is punctured and floods with water, the bulkheads prevent water from flooding the rest of the ship, keeping the vessel afloat.

In software architecture, bulkheads isolate computational resources (thread pools, memory, connection pools) across different features:

```
                      ┌──► Search Thread Pool (Max 20 threads)
                      │
Incoming Requests ────┼──► Recommendations Thread Pool (Max 10 threads)
                      │
                      └──► Checkout / Payment Thread Pool (Max 50 threads, ISOLATED!)
```

### Why Shared Thread Pools Fail
If all incoming endpoints share a single generic worker pool of 100 threads:
- If an unindexed query makes the "Recommendations" endpoint stall for 5 seconds, all 100 threads quickly become blocked waiting for recommendations.
- Suddenly, users cannot complete their **Checkout** or process payments—not because the payment gateway is broken, but because the shared thread pool was completely monopolized by a non-critical feature!
- **Bulkhead Rule**: Never allow non-critical background features to starve core revenue-generating business paths.

---

## 2. Adaptive Load Shedding: Serving 80% Instead of Collapsing 100%

When a server is operating at maximum capacity, it must **actively shed load**—rejecting excess requests immediately to protect the performance of the requests it has already admitted.

```
Incoming Request
      │
      ▼
Check Current In-Flight Concurrency (Little's Law: L = λW)
      │
      ├── Under Threshold ──► Admit and process immediately (20ms latency maintained!)
      │
      └── Over Threshold ───► REJECT IMMEDIATELY (HTTP 503 / 429) [< 1ms reject time]
```

### Why Failing Fast Saves the System
Rejecting a request with HTTP 503 in under $1\text{ms}$ consumes almost zero CPU and zero memory.
- The 1,000 admitted requests complete cleanly with pristine $20\text{ms}$ latency and 100% success rate.
- If the server had tried to accept all 5,000 requests, **all 5,000 would have timed out**, resulting in a 0% success rate.
- **Serving 1,000 happy customers and rejecting 4,000 with clear retry instructions is infinitely superior to failing all 5,000 customers simultaneously.**

---

## 3. Tiered Priority Degradation

When load shedding is active, drop traffic based on business criticality:
1. **Tier 1 (Non-Essential Telemetry)**: Drop clickstream analytics, metrics collection, and background email notifications immediately.
2. **Tier 2 (Nice-To-Have Features)**: Return static fallbacks for personalized recommendations and reviews.
3. **Tier 3 (Core Business Transactions)**: Reserve dedicated CPU headroom exclusively for authentication, cart updates, and payment checkout.
