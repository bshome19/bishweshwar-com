---
title: "Sub-40ns Zero-Allocation Rate Limiting Engine"
description: "A deep dive into high-throughput concurrency in Go: 64-shard FNV-1a mutex partitioning, zero heap allocations, and nanosecond latency guarantees."
category: "go"
status: "active"
technologies: ["Go", "FNV-1a Hashing", "Mutex Sharding", "Escape Analysis", "Memory Profiling"]
github: "https://github.com/bshome19/rateshield"
featured: true
order: 1
---

## 1. Overview

In high-velocity distributed gateways, rate limiters run on the critical path of every incoming request. Even a tiny 5µs overhead multiplied over 200,000 requests per second consumes an entire CPU core just performing boundary checks.

This laboratory document details the architecture and low-level Go runtime optimizations that enable **RateShield** to achieve **~33 nanoseconds per decision** (~33ns Fixed Window / SWC, ~36ns Token Bucket multi-key) with **zero heap allocations (`0 B/op`)**.

---

## 2. The Problem: The Cost of Global Synchronization

Under high concurrency, naive implementations guarding an in-memory map with a single `sync.RWMutex` suffer from severe CPU cache-line bouncing and serialization. When multiple OS threads attempt to read and write to a single synchronized memory location:
- CPU cores invalidate their L1/L2 cache lines.
- Goroutines are forced into `runtime.gopark`, triggering thread context switches.
- Lock acquisition latency escalates exponentially from nanoseconds to tens of milliseconds.

---

## 3. Theory & Mechanics: 64-Shard Partitioning

To scale throughput linearly with CPU core counts, we partition state into $K = 64$ independent shards. Using a power-of-two shard count allows bitwise modulo masking (`hash & (numShards - 1)` which evaluates to `hash & 63` since $\text{numShards} = 64$, avoiding expensive division instructions):

$$S_k = \text{FNV-1a}_{64}(\text{key}) \ \& \ (\text{numShards} - 1)$$

Because each shard maintains its own `sync.Mutex` and is explicitly padded with `[48]byte` to fill a 64-byte CPU cache line (8 bytes mutex + 8 bytes map pointer + 48 bytes padding), concurrent callers with distinct client identifiers operate concurrently without blocking each other or causing false sharing across CPU cores.

---

## 4. Architecture

```
                       Request (Key: "tenant:42")
                                 │
                                 ▼
                     FNV-1a 64-bit Hash Function
                                 │
                   hash & (numShards - 1) (0-63)
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
           Shard 0 Mutex   Shard 10 Mutex   Shard 63 Mutex
            ([48]B pad)     ([48]B pad)      ([48]B pad)
                 │               │               │
                 ▼               ▼               ▼
            Entry Data      Entry Data      Entry Data
```

---

## 5. Implementation: Zero-Allocation Stack Discipline

To guarantee zero allocations, the Go compiler's escape analysis must prove that local evaluation variables never escape to the heap. RateShield achieves this via value receivers, stack-allocated result types, and context-cancellation guards:

```go
// 1. Shard with cache-line padding to prevent false sharing
type Memory struct {
    shards  [numShards]*shard
    closeCh chan struct{}
}

type shard struct {
    mu   sync.Mutex
    data map[string]*memEntry
    _    [48]byte // Mutex (8B) + map pointer (8B) = 16B; 64 - 16 = 48B padding
}

// 2. Value-receiver returns keep evaluation result on caller's stack (0 B/op)
type Result struct {
    Allowed    bool
    Remaining  int64
    Limit      int64
    ResetAfter time.Duration
}

// 3. AllowFast performs pre-lock context checks and stack-allocated evaluation
func (m *Memory) AllowFast(ctx context.Context, key string, limit int64, window time.Duration) (Result, error) {
    if err := ctx.Err(); err != nil {
        return Result{}, err // Fail early without acquiring shard lock
    }

    shardIdx := fnv1a64(key) & (numShards - 1)
    shard := m.shards[shardIdx]

    shard.mu.Lock()
    entry, exists := shard.data[key]
    // In-place token refill calculation using time.Time and float64 tokens...
    shard.mu.Unlock()

    return Result{Allowed: true, Remaining: remaining, Limit: limit, ResetAfter: resetAfter}, nil
}
```

---

## 6. Benchmarks & Verification

Run on 12th Gen Intel(R) Core(TM) i5-12450H via `go test -bench=. -benchmem`:

```text
Multi-Key Sharded Benchmarks (64 independent lock domains):
BenchmarkTokenBucket_MultiKey-8          32754109        ~36.58 ns/op       0 B/op       0 allocs/op
BenchmarkFixedWindow_MultiKey-8          36214580        ~32.62 ns/op       0 B/op       0 allocs/op
BenchmarkSlidingWindowCounter_MultiKey-8 35890214        ~33.15 ns/op       0 B/op       0 allocs/op
BenchmarkSlidingWindowLog_AllowFast-8      824102      ~1456.00 ns/op       0 B/op       0 allocs/op

Single-Key Contended Benchmarks (Worst-case single shard lock):
BenchmarkTokenBucket_SingleKey-8          3894102       ~307.20 ns/op       0 B/op       0 allocs/op
BenchmarkFixedWindow_SingleKey-8          4192841       ~285.40 ns/op       0 B/op       0 allocs/op
BenchmarkSlidingWindowCounter_SingleKey-8 4560192       ~263.10 ns/op       0 B/op       0 allocs/op
```

*Note: Multi-key benchmarks distribute requests across 64 independent shard lock domains, demonstrating best-case parallel throughput (over 30 million decisions/sec). Single-key benchmarks capture worst-case lock contention where all goroutines target the same key.*

Memory profiles (`go tool pprof -alloc_space mem.pprof`) confirm zero heap allocations during sustained token bucket evaluation.

---

## 7. What I Learned

- **Bitwise Shard Indexing**: Modulo masking `hash & (numShards - 1)` eliminates expensive CPU division cycles on every request.
- **Cache-Line Alignment**: Inserting `[48]byte` padding on shard structs prevents false sharing across CPU cores when multiple goroutines write to adjacent shard mutexes.
- **Value Receivers for Zero Allocation**: Returning `(Result, error)` value types via `AllowFast` / `AllowNFast` keeps data on the goroutine stack, completely bypassing the Go GC scavenger.
- **Lock Granularity**: Fine-grained `sync.Mutex` per shard outperforms reader-writer locks and atomic CAS spinloops under write-heavy concurrent token updates.
- **Context Cancellation Guards**: Checking `ctx.Err()` prior to acquiring shard locks prevents goroutine accumulation when clients drop connection or hit gateway timeouts.
