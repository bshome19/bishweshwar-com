---
title: "RateShield — High-Performance Distributed Rate Limiter"
description: "An ultra-fast, zero-allocation Go rate limiter achieving sub-40ns execution time using a 64-shard in-memory engine, atomic Redis Lua scripting, and multi-tier failover."
status: "active"
technologies: ["Go", "Redis", "Lua", "FNV-1a Hashing", "net/http", "Gin", "Fiber", "Echo", "Chi"]
github: "https://github.com/bshome19/rateshield"
featured: true
category: "Distributed Systems"
metrics: [
  "Sub-40ns execution time (34.84ns Token Bucket)",
  "0 B/op allocations on hot path",
  "64-shard FNV-1a mutex engine",
  "Atomic single-RTT Redis Lua scripts",
  "Multi-tier resilient fallback"
]
order: 1
---

## Overview

**RateShield** is an open-source, production-grade distributed rate limiting library for Go. It is architected from the ground up for high-throughput, low-latency API gateways and microservices that cannot tolerate garbage collection pauses or lock contention under heavy concurrency.

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

1. **64-Shard Mutex Memory Engine**: Partitions the hash space into 64 distinct lock domains using 64-bit FNV-1a hashing, eliminating cross-core lock contention.
2. **Zero-Allocation Execution (`0 B/op`)**: Exploits value receivers and stack allocation semantics to ensure zero heap pressure during rate evaluations.
3. **Atomic Distributed Redis Lua**: Single round-trip evaluation guarantees race-condition-free operation across distributed Kubernetes replicas.
4. **Resilient Failover**: Automatically degrades from Redis cluster to localized sharded memory if network partitions occur.
5. **Modern IETF Headers**: Supports modern `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` standard headers alongside legacy `X-RateLimit-*`.

## Benchmark Details

Evaluated on 12th Gen Intel(R) Core(TM) i5-12450H (`go test -bench=. -benchmem ./algorithms`):

- **Token Bucket**: 34.84 ns/op | 0 B/op | 0 allocs
- **Fixed Window**: 35.61 ns/op | 0 B/op | 0 allocs
- **Sliding Window Counter**: 38.16 ns/op | 0 B/op | 0 allocs
- **Sliding Window Log**: 175.70 ns/op | 48 B/op | 1 alloc
