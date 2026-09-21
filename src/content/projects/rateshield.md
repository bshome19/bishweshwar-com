---
title: "RateShield — High-Performance Distributed Rate Limiter"
description: "An ultra-fast, zero-allocation Go rate limiter achieving sub-40ns execution time using a 64-shard in-memory engine, atomic Redis Lua scripting, and multi-tier failover."
status: "active"
technologies: ["Go", "Redis", "Lua", "FNV-1a Hashing", "net/http", "Gin", "Fiber", "Echo", "Chi"]
github: "https://github.com/bshome19/rateshield"
featured: true
category: "Distributed Systems"
metrics: [
  "Sub-40ns execution time (~33ns Fixed Window / SWC multi-key)",
  "0 B/op allocations on hot path",
  "64-shard FNV-1a mutex engine",
  "Atomic single-RTT Redis Lua scripts",
  "Multi-tier resilient fallback"
]
order: 1
---

## Overview

**RateShield** is an open-source, production-grade distributed rate limiting library for Go (Go 1.24+). It is architected from the ground up for high-throughput, low-latency API gateways and microservices that cannot tolerate garbage collection pauses or lock contention under heavy concurrency.

## Architecture

RateShield utilizes the **Strategy Pattern** combined with **Dependency Inversion**, decoupling rate limiting algorithms (Token Bucket, Fixed Window, Sliding Window Counter, Sliding Window Log) from backend storage implementations:

```
 ┌──────────────────────────────────────────────────────────────────┐
 │                        HTTP Request / API                        │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                   Middleware / Key Extractor                     │
 │          (net/http, Gin, Fiber, Echo, Chi | IP / User)           │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                        rateshield.Limiter                        │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
 ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
 │ Token Bucket  │        │ Fixed Window  │        │Sliding Window │
 └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                         store.Store                              │
 │   (Sharded Memory | Atomic Redis Lua | Resilient Fallback)       │
 └──────────────────────────────────────────────────────────────────┘
```

## Key Technical Innovations

1. **64-Shard Mutex Memory Engine**: Partitions the hash space into 64 distinct lock domains using bitwise indexing (`hash & (numShards - 1)`) with `[48]byte` cache-line padding to prevent false sharing and eliminate cross-core lock contention.
2. **Zero-Allocation Execution (`0 B/op`)**: Exploits value receivers (`AllowFast` / `AllowNFast`) and stack allocation semantics to ensure zero heap allocations during rate evaluations.
3. **Atomic Distributed Redis Lua**: Single round-trip evaluation with full auxiliary key cleanup via SCAN on reset, guaranteeing race-condition-free operation across distributed Kubernetes replicas.
4. **Resilient Failover**: Automatically degrades from Redis cluster to localized sharded memory if network partitions occur.
5. **Context Cancellation Guards**: All memory store evaluation methods verify `ctx.Err()` prior to acquiring shard locks, preventing goroutine pile-up on cancelled requests.
6. **Modern IETF Headers**: Supports modern `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` standard headers alongside legacy `X-RateLimit-*`.

## Benchmark Details

Evaluated on 12th Gen Intel(R) Core(TM) i5-12450H (`go test -bench=. -benchmem ./algorithms`):

- **Token Bucket (Multi-Key)**: ~36 ns/op | 0 B/op | 0 allocs
- **Fixed Window (Multi-Key)**: ~33 ns/op | 0 B/op | 0 allocs
- **Sliding Window Counter (Multi-Key)**: ~33 ns/op | 0 B/op | 0 allocs
- **Sliding Window Log (AllowFast)**: ~1,456 ns/op | 0 B/op | 0 allocs
