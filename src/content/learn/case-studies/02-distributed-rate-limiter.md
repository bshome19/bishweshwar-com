---
id: case-distributed-rate-limiter
title: "Real-World Case Study: Designing a Distributed Rate Limiter"
track: case-studies
module: infrastructure-systems
level: advanced
duration: 40
prerequisites: [mc-rate-limiter-engine, caching-topologies-and-eviction]
concepts: [distributed-rate-limiter, redis-lua, race-conditions, sliding-window-counter, multi-region-sync]
tags: [case-study, rate-limiter, redis, lua, concurrency, distributed-systems]
interactive:
  type: rate-limiter
  enabled: true
order: 2
---

# Real-World Case Study: Designing a Distributed Rate Limiter

In a single server, rate limiting is straightforward: maintain atomic counters in memory.

In a modern cloud infrastructure with **200 API gateway instances** distributed across 3 global regions serving 500,000 requests per second, in-memory counters fail:
- A malicious actor can cycle through different API gateway pods, multiplying their allowed quota by 200x!
- You must design a **Distributed Rate Limiter** that enforces precise rate limits globally with sub-millisecond overhead.

---

## 1. The Distributed Race Condition

Suppose you use an external shared cache (Redis) with naive get-and-set commands:

```python
# THE DISTRIBUTED RACE HAZARD
current_count = redis.get(client_id)
if current_count < 100:
    redis.incr(client_id)
    return ALLOW
return REJECT
```

If two concurrent requests arrive at Gateway Pod 1 and Gateway Pod 2 simultaneously:
1. Both pods execute `redis.get(client_id)` and receive `99`.
2. Both pods conclude `99 < 100`.
3. Both pods increment and allow the request.
4. Quota was exceeded! Under heavy concurrency, race conditions allow thousands of requests past the rate limit.

---

## 2. The Solution: Atomic Redis Lua Scripts

Redis processes Lua scripts **atomically in a single-threaded execution context**. No other command or script can run while a Lua script executes:

```lua
-- ATOMIC SLIDING WINDOW COUNTER IN REDIS LUA
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local clear_before = current_time - window

-- 1. Remove expired timestamps
redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)

-- 2. Count current elements in window
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    -- 3. Add current timestamp with unique member
    redis.call('ZADD', key, current_time, current_time)
    redis.call('EXPIRE', key, window)
    return 1 -- ALLOWED
else
    return 0 -- THROTTLED
end
```

By executing the cleanup, count, and insertion in one atomic Lua script, race conditions are mathematically eliminated.

---

## 3. High-Scale Optimization: Local Batching & Token Synchronization

At 500,000 QPS, querying a central Redis cluster for every single incoming HTTP request introduces:
- Network round-trip latency ($1\text{ to }3\text{ ms}$ overhead per request).
- Centralized Redis cluster saturation.

### The Batch Reservation Pattern (Stripe Architecture)
Instead of asking Redis for 1 token on every single request:
1. Each API gateway pod asks Redis for a **batch of 50 tokens** at a time: `redis.decrby(quota_key, 50)`.
2. The gateway satisfies the next 50 user requests purely in local CPU memory with **zero network latency** ($<0.01\text{ms}$).
3. When the local batch is exhausted, the pod reserves another batch.
4. **Result**: Central Redis query volume is reduced by **98%**, while still preventing unbounded quota exhaustion!
