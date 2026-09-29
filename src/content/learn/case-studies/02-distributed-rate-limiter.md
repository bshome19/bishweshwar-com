---
id: case-study-rate-limiter
title: "Deep Dive: Building a Distributed Rate Limiter"
track: case-studies
module: distributed-rate-limiter
level: all
duration: 25
prerequisites: [machine-coding-rate-limiter, distributed-systems-cap-pacelc]
concepts: [distributed-rate-limiting, token-bucket, redis, lua-scripting, consistency, sliding-window]
tags: [all, case-study, rate-limiter, distributed, redis]
interactive:
  type: architecture-evolution
  enabled: true
order: 2
---

# Deep Dive: Building a Distributed Rate Limiter

Rate limiting is a deceptively simple concept — "allow at most N requests per minute per client." The single-process version is straightforward (we built three algorithms in the machine-coding track). The distributed version — across multiple API servers, at massive scale, with consistency guarantees — reveals real engineering challenges.

---

## The Problem: Multiple Servers, One Rate Limit

You have 10 API servers behind a load balancer. Each client is rate-limited to 100 requests per minute. But requests from the same client might hit different servers.

If each server maintains its own counter, a client could send 100 requests to each of the 10 servers — 1,000 total requests — and no individual server would flag a violation.

**You need shared state.** All servers must agree on the current count for each client.

---

## Solution: Centralized State in Redis

Redis is the natural choice: it's fast (sub-millisecond operations), it supports atomic operations, and it's a shared state store accessible by all API servers.

**Token bucket in Redis** (using a Lua script for atomicity):

```lua
-- Token bucket rate limiter (runs atomically in Redis)
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last = tonumber(bucket[2]) or now

-- Refill tokens
local elapsed = math.max(0, now - last)
tokens = math.min(capacity, tokens + elapsed * refill_rate)

local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end

redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) * 2)

return allowed
```

The Lua script runs atomically in Redis — no race condition even with 10 concurrent API servers executing it simultaneously for the same client.

---

## Challenge: What If Redis Goes Down?

Redis is now a single point of failure. If Redis is unavailable, rate limiting stops working.

**Options**:

**Fail open**: If Redis is down, allow all requests. The system is unprotected but continues serving users. Appropriate for most APIs — brief periods without rate limiting are acceptable.

**Fail closed**: If Redis is down, reject all requests. The system is protected but users are blocked. Appropriate for systems where overload would be catastrophic.

**Local fallback**: If Redis is down, fall back to per-server rate limiting. Each server maintains its own counter. The rate limit is less accurate (a client gets N×servers the intended limit) but it's better than nothing.

**Redis with replication**: Use Redis Sentinel or Redis Cluster for high availability. If the primary fails, a replica takes over in seconds.

---

## Challenge: Scale Beyond One Redis Instance

At extreme scale (millions of clients, hundreds of thousands of rate limit checks per second), a single Redis instance becomes the bottleneck.

**Shard the rate limit state**: Hash the client ID to determine which Redis shard holds their state. Each shard handles a subset of clients. Rate limit checks are distributed across shards.

This is consistent hashing applied to rate limiting — the same concept from the databases track.

---

## Challenge: Multi-Region Rate Limiting

Your API is deployed in 3 regions (US, EU, Asia). Each region has its own Redis. A client in the US hits the US Redis. A client in Europe hits the EU Redis.

But a sophisticated client could send 100 requests to the US region and 100 to the EU region — 200 total, bypassing the limit.

**Options**:

**Accept the inaccuracy**: Rate limits are approximate. Being 2x over for a brief period during cross-region abuse is acceptable for most use cases.

**Cross-region synchronization**: Periodically sync counters between regions. The counters won't be perfectly consistent but they'll converge. A client abusing from multiple regions will eventually be caught.

**Central rate limiting**: All rate limit checks go to a single central Redis. Adds latency (cross-region round-trip) but is perfectly accurate. Only viable for latency-tolerant rate limiting.

---

## The Honest Summary

Distributed rate limiting is a spectrum of trade-offs:

| Approach | Accuracy | Latency | Complexity |
|---|---|---|---|
| Per-server (no sharing) | Poor | Best | Minimal |
| Single Redis | Good | Good | Low |
| Sharded Redis | Good | Good | Medium |
| Cross-region synced | Approximate | Good | High |
| Central Redis | Perfect | Worst | Low |

Most production systems use "single Redis per region with fail-open" — good accuracy, good latency, and acceptable behavior during Redis failures. Perfect accuracy across regions is rarely worth the added complexity.

This case study illustrates how a "simple" feature (count requests) becomes genuinely complex when distributed across multiple servers, regions, and failure modes.
