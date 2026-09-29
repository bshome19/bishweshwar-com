---
id: machine-coding-rate-limiter
title: "Building a Rate Limiter from Scratch"
track: machine-coding
module: algorithms
level: advanced
duration: 30
prerequisites: [reliability-circuit-breakers-retries]
concepts: [rate-limiting, token-bucket, sliding-window, fixed-window, thread-safety, distributed-rate-limiting]
tags: [advanced, machine-coding, rate-limiter, token-bucket, algorithms]
interactive:
  type: rate-limiter-simulator
  enabled: true
order: 4
---

# Building a Rate Limiter from Scratch

A rate limiter answers a simple question: "Should this request be allowed, or has this client exceeded their limit?"

The implementation has to be fast (checking every request adds latency), correct (no client should exceed their limit even under concurrent access), and fair (clients shouldn't be able to game the system).

This exercise builds three rate limiting algorithms — each solving a problem the previous one had.

---

## Algorithm 1: Fixed Window Counter

The simplest approach. Divide time into fixed windows (e.g., 1-minute windows). Count requests per window. If the count exceeds the limit, reject.

```python
import time
from threading import Lock

class FixedWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.counters: dict[str, dict] = {}  # client_id → {window, count}
        self.lock = Lock()
    
    def allow(self, client_id: str) -> bool:
        with self.lock:
            now = time.time()
            current_window = int(now / self.window_seconds)
            
            entry = self.counters.get(client_id)
            if entry is None or entry["window"] != current_window:
                self.counters[client_id] = {"window": current_window, "count": 1}
                return True
            
            if entry["count"] < self.max_requests:
                entry["count"] += 1
                return True
            
            return False
```

**The problem**: Boundary spikes. A client sends 100 requests at 11:59:59 (window 1) and 100 more at 12:00:00 (window 2). They've sent 200 requests in 2 seconds — but the rate limiter sees 100 per window, which is within the limit of 100/minute. The fixed window boundary creates a loophole.

---

## Algorithm 2: Sliding Window Log

Track the exact timestamp of every request. Count how many timestamps fall within the sliding window.

```python
from collections import deque

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, deque] = {}
        self.lock = Lock()
    
    def allow(self, client_id: str) -> bool:
        with self.lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            if client_id not in self.requests:
                self.requests[client_id] = deque()
            
            timestamps = self.requests[client_id]
            
            # Remove expired timestamps
            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()
            
            if len(timestamps) < self.max_requests:
                timestamps.append(now)
                return True
            
            return False
```

**No boundary spike problem**: The window slides continuously, so there's no boundary to exploit.

**The problem**: Memory. Storing every timestamp for every client uses significant memory at high request rates. 10,000 clients × 1000 requests/minute × 8 bytes per timestamp = 80MB. It adds up.

---

## Algorithm 3: Token Bucket

The token bucket is the most widely used rate limiting algorithm. It's memory-efficient, handles bursts gracefully, and is simple to implement.

**The mental model**: Imagine a bucket that holds tokens. Tokens are added at a steady rate (the "refill rate"). Each request consumes one token. If the bucket is empty, the request is rejected.

```python
class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity          # Max burst size
        self.refill_rate = refill_rate    # Tokens per second
        self.buckets: dict[str, dict] = {}
        self.lock = Lock()
    
    def allow(self, client_id: str) -> bool:
        with self.lock:
            now = time.time()
            
            if client_id not in self.buckets:
                self.buckets[client_id] = {
                    "tokens": self.capacity,
                    "last_refill": now
                }
            
            bucket = self.buckets[client_id]
            
            # Refill tokens based on elapsed time
            elapsed = now - bucket["last_refill"]
            new_tokens = elapsed * self.refill_rate
            bucket["tokens"] = min(self.capacity, bucket["tokens"] + new_tokens)
            bucket["last_refill"] = now
            
            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return True
            
            return False
```

**Why token bucket is elegant**:
- **Burst handling**: The bucket can hold up to `capacity` tokens, allowing short bursts above the steady-state rate. A bucket with capacity=100 and refill=10/sec allows bursts of 100 requests, then settles to 10/sec.
- **Memory efficient**: One small struct per client (tokens + timestamp), regardless of request rate.
- **No boundary effects**: The bucket refills continuously — no window boundaries to exploit.

**This is what Stripe, GitHub, and most API providers use** (or a close variant). The capacity controls burst size, the refill rate controls sustained throughput.

---

## Distributed Rate Limiting

All three implementations above work in a single process. But if you have multiple API servers behind a load balancer, each server has its own rate limiter with its own counts. A client could hit each server separately and get N× the intended rate limit.

**The fix**: Centralize the rate limiter state in Redis.

```python
import redis

class RedisTokenBucket:
    def __init__(self, redis_client: redis.Redis, capacity: int, refill_rate: float):
        self.redis = redis_client
        self.capacity = capacity
        self.refill_rate = refill_rate
    
    def allow(self, client_id: str) -> bool:
        # Lua script runs atomically in Redis — no race conditions
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now
        
        local elapsed = now - last_refill
        tokens = math.min(capacity, tokens + elapsed * refill_rate)
        
        if tokens >= 1 then
            tokens = tokens - 1
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 3600)
            return 1
        else
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 3600)
            return 0
        end
        """
        
        result = self.redis.eval(lua_script, 1, f"ratelimit:{client_id}",
                                  self.capacity, self.refill_rate, time.time())
        return result == 1
```

The Lua script runs atomically in Redis — no race conditions even with multiple API servers calling simultaneously. This is how production distributed rate limiters work.

---

## The Bigger Picture

Rate limiting connects to multiple concepts from this platform:
- **Reliability**: Rate limiting protects systems from overload (load shedding)
- **APIs**: Rate limit headers tell clients their limits (`X-RateLimit-Remaining`)
- **Distributed Systems**: Centralizing state in Redis is a distributed coordination problem
- **Caching**: The token bucket state is essentially cached in Redis

Building it from scratch gives you intuition for all of these.
