---
title: "28 Million Decisions Per Second. Zero Allocations. One Rate Limiter."
description: "How I engineered RateShield: an ultra-fast, zero-allocation Go rate limiter with a 64-shard memory engine, atomic Redis Lua scripting, and multi-tier failover."
pubDate: 2024-04-10
category: "go"
tags: ["go", "redis", "concurrency", "distributed-systems", "performance"]
featured: true
canonicalUrl: "https://www.bishweshwar.com/blog/28-million-decisions-per-second-rate-limiter"
readingTime: "7 min read"
---

When building high-traffic API gateways and distributed backend microservices, rate limiting is usually the very first layer of defense. It guards downstream databases against cascading failures, protects auth endpoints from credential stuffing, and enforces fair resource allocation across tenants.

However, in ultra-low latency systems, the rate limiter itself can quickly become the latency bottleneck. If your rate limiter incurs lock contention across CPU cores or generates thousands of heap allocations per second, the Go runtime garbage collector (GC) will introduce unacceptable latency spikes.

To solve this, I engineered **RateShield** — an open-source, zero-allocation rate limiting library for Go (Go 1.24+) capable of delivering **over 28 million decisions per second** (and surpassing **30 million decisions/sec** with latest multi-key optimizations) per node with sub-40ns execution time and zero heap allocations.

> [!NOTE]
> **Update (September 2026):** RateShield v1.x has been hardened with:
> - **Go 1.24+ runtime**: Modernized test contexts using `t.Context()`.
> - **Context cancellation guards**: All memory store `Allow*` methods now check `ctx.Err()` before acquiring shard locks, preventing goroutine pile-up when HTTP requests are already cancelled.
> - **Slimmed `Store` interface**: The core `Store` interface now has 6 methods (down from 9). Unused `Get/Set/Increment` moved to a separate `LegacyStore` interface.
> - **Correct cache-line padding**: Shard struct padding fixed to `[48]byte` to accurately fill a 64-byte cache line with `sync.Mutex`.
> - **Redis Reset() cleanup**: `Reset()` now uses SCAN to delete all auxiliary algorithm keys, preventing key leaks.
> - **12 benchmarks**: 4 new benchmarks added including SWL zero-alloc, multi-key standard API, multi-key FW, and multi-key SWC.
> - **30M+ ops/sec**: Fixed Window and Sliding Window Counter now achieve ~33ns per operation in multi-key sharded mode, surpassing Token Bucket.

---

## 1. The Core Engineering Challenges

In distributed Go services handling hundreds of thousands of queries per second (QPS), traditional rate limiting libraries suffer from three primary architectural problems:

1. **Global Mutex Bottlenecks**: Guarding an in-memory hash map with a single `sync.RWMutex` serializes execution across multiple OS threads. Under heavy concurrent load, CPUs spend more cycles waiting for lock acquisition than computing token refills.
2. **Heap Allocations & GC Pressure**: Instantiating temporary state objects, context structs, and error interfaces in the hot path triggers Go runtime escape analysis to allocate on the heap. At 100k+ QPS, this produces millions of heap allocations that saturate the scavenger and pause execution.
3. **Distributed Split-Brain & Race Conditions**: Relying on multiple round-trip commands to Redis (e.g., `GET`, calculate, then `SET`) introduces race conditions where concurrent workers bypass thresholds.

---

## 2. Architectural Solution: The 64-Shard Mutex Engine

To eliminate global lock contention without introducing the memory overhead of lock-free CAS linked lists, RateShield implements a **64-shard memory engine** using 64-bit FNV-1a hashing:

```go
type Memory struct {
    shards  [numShards]*shard
    closeCh chan struct{}
}

type shard struct {
    mu   sync.Mutex
    data map[string]*memEntry
    _    [48]byte // Cache line padding: Mutex(8) + map-ptr(8) = 16; 64 - 16 = 48
}
```

By computing `hash = fnv1a64(key)` and indexing with `shard = hash & (numShards - 1)` — which evaluates to `hash & 63` since `numShards = 64` — concurrent requests for different clients (`user:101`, `user:102`) route to entirely independent lock domains. This allows linear scaling across multi-core processors without cache line false sharing.

```
┌──────────────────────────────────────────────────────────┐
│                   Incoming HTTP Request                  │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼ FNV-1a Hash (Key)
               ┌─────────────┴─────────────┐
               ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │   Shard 0    │   ......   │   Shard 63   │
        │  sync.Mutex  │            │  sync.Mutex  │
        │  [48]B pad   │            │  [48]B pad   │
        └──────┬───────┘            └──────┬───────┘
               ▼                           ▼
           Local Entry                 Local Entry
```

---

## 3. Achieving True Zero Allocations (`0 B/op`)

In the hot path of `limiter.Allow(ctx, key)`, every byte matters. To achieve `0 B/op` across Token Bucket and Sliding Window Counter algorithms:

- **Value-receiver returns**: The `AllowFast` / `AllowNFast` methods return `Result, error` (value type) instead of `*Result, error` (pointer type), keeping the result struct entirely on the goroutine stack with zero heap allocations.
- **Pre-lock context cancellation guards**: All memory store evaluations check `ctx.Err()` before acquiring shard locks, safeguarding against goroutine pile-up during HTTP request drops.

---

## 4. Benchmark Results: 12th Gen Intel i5-12450H

Benchmarks executed using Go's testing runtime (`go test -bench=. -benchmem ./algorithms`):

| Algorithm | ns/op (multi-key) | ns/op (single-key) | Memory (B/op) | Allocations | Complexity |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Token Bucket** | **~36 ns** | **~307 ns** | **0 B/op** | **0 allocs** | $\mathcal{O}(1)$ |
| **Fixed Window** | **~33 ns** | **~285 ns** | **0 B/op** | **0 allocs** | $\mathcal{O}(1)$ |
| **Sliding Window Counter** | **~33 ns** | **~263 ns** | **0 B/op** | **0 allocs** | $\mathcal{O}(1)$ |
| **Sliding Window Log** | — | **~1,456 ns** | **0 B/op** | **0 allocs** | $\mathcal{O}(\log N)$ |

*Note: Multi-key benchmarks distribute requests across 64 independent shard lock domains, showing best-case throughput. Single-key benchmarks show worst-case contention where all goroutines compete for the same shard lock. Numbers vary ±20% across runs depending on system load.*

At **~33 nanoseconds per operation** (multi-key sharded), a single core can evaluate over **30 million decisions per second**, completely eliminating rate limiting as a system bottleneck.

---

## 5. Distributed Synchronization via Atomic Redis Lua Scripts

When running horizontally scaled Kubernetes pods, localized rate limiting alone is insufficient. RateShield provides an atomic Redis store powered by single-round-trip Lua scripts.

Executing the check-and-decrement logic inside the Redis engine guarantees atomic execution without distributed locks:

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or "0")

if current + 1 > limit then
    return 0 -- Rejected
else
    redis.call("INCRBY", key, 1)
    if current == 0 then
        redis.call("EXPIRE", key, ARGV[2])
    end
    return 1 -- Allowed
end
```

---

## 6. Multi-Tier Resilient Storage Fallback

What happens when Redis network latency spikes or a cluster failover occurs? Many systems either fail open (allowing DDoS traffic through) or fail closed (dropping legitimate user requests).

RateShield introduces a **Multi-Tier Resilient Fallback Store**:

```go
primaryRedis, _ := store.NewRedis(store.RedisConfig{Client: redisClient})
secondaryMem := store.NewMemory()

resilientStore := store.NewFallback(store.FallbackConfig{
    Primary:   primaryRedis,
    Secondary: secondaryMem,
    OnPrimaryError: func(err error) {
        log.Printf("⚠️ Redis unavailable (%v), degrading to local memory", err)
    },
})

limiter, _ := rateshield.New(
    rateshield.WithAlgorithm(rateshield.TokenBucketAlgorithm),
    rateshield.WithStore(resilientStore),
)
```

If the primary Redis round-trip exceeds timeout thresholds, RateShield transparently shifts requests to the local 64-shard memory engine within nanoseconds, preserving service availability without operator intervention.

---

## Conclusion

Designing high-throughput distributed systems requires thinking deeply about memory layouts, lock granularity, and network boundaries. RateShield demonstrates that with thoughtful engineering — sharded locks, stack allocation discipline, and resilient fallback tiers — you don't have to sacrifice speed for safety.

The code and benchmarks are fully open-source on GitHub at [github.com/bshome19/rateshield](https://github.com/bshome19/rateshield).
