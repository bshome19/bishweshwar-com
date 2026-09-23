---
id: caching-thundering-herd-and-stampede-prevention
title: "Cache Stampedes and the Thundering Herd: 4 Defenses"
track: caching
module: reliability
level: intermediate
duration: 20
prerequisites: [caching-topologies-and-eviction]
concepts: [cache-stampede, thundering-herd, mutex, singleflight, probabilistic-early-expiration, stale-while-revalidate]
tags: [caching, reliability, high-scale, redis, resilience]
order: 2
---

# Cache Stampedes and the Thundering Herd: 4 Proven Defenses

In high-concurrency systems serving thousands of queries per second, the most dangerous moment for a database is not when traffic spikes—it is when a single hot cache key expires.

---

## 1. The Anatomy of a Cache Stampede

Imagine the home page news feed or an e-commerce product page serving **10,000 QPS**.

1. The cache key `product:1001` has a Time-To-Live (TTL) of 300 seconds.
2. The cache hit rate is 99.99%; the persistent database comfortably handles 1 query every 5 minutes.
3. At time $T = 300.000\text{s}$, the key expires from Redis memory.
4. Over the next $50\text{ milliseconds}$, 500 concurrent incoming HTTP requests all experience a **cache miss** simultaneously.
5. All 500 application threads simultaneously issue expensive SQL join queries to the persistent database.
6. The database connection pool is instantly exhausted; CPU utilization hits 100%; queries queue up and timeout.
7. Frustrated clients hit refresh, spawning another 1,000 queries. The entire backend platform collapses in a cascading failure.

This phenomenon is known as the **Cache Stampede** (or **Dog-Piling / Thundering Herd**).

---

## 2. Four Production Defenses

### Defense 1: Mutex Locking (Single Recomputor)
When a cache miss occurs, the worker thread attempts to acquire a short-lived distributed lock (e.g., Redis `SET lock:key "uuid" NX PX 5000`):
- The single thread that successfully acquires the lock executes the heavy database query and repopulates the cache.
- All other 499 threads fail to acquire the lock, sleep for 20–50ms, and re-check the cache.
- **Trade-Off**: Prevents database stampedes, but causes temporary client-side latency spikes while waiting for the lock.

---

### Defense 2: Go Singleflight Pattern (In-Process Coalescing)
If multiple concurrent goroutines within the same application process request the exact same key:
- The `singleflight.Group` intercepts the calls and executes the underlying fetch function **exactly once**.
- When that single fetch completes, the result is broadcast to all waiting callers simultaneously.
- Combined with connection pooling, this cuts downstream query volume by up to 99% inside each web instance.

---

### Defense 3: Stale-While-Revalidate (Background Refresh)
Instead of returning a hard cache miss when an item reaches its expiration time:
- The cache returns the **slightly stale** cached data immediately to the user ($0\text{ms}$ latency penalty).
- Concurrently, the cache server fires an asynchronous background worker to re-fetch fresh data from the database and refresh the cache.
- User experience is never interrupted by database recomputation stalls.

---

### Defense 4: Probabilistic Early Expiration (XFetch Algorithm)
Formulated by Vattani et al. in 2015, this algorithm introduces randomness to prevent simultaneous expiration:

$$\text{Should Recompute} = -\beta \times \delta \times \ln(\text{random}()) > (\text{TTL} - \text{current\_time})$$

Where:
- $\delta$ = The measured execution time of the database query.
- $\beta > 0$ = Aggressiveness multiplier.
- As the key approaches expiration, the probability of an early background refresh exponentially increases with incoming traffic volume. The heavier the traffic, the earlier and more predictably a single lucky request refreshes the key before it ever truly expires!
