---
id: caching-topologies-and-eviction
title: "Caching Topologies and Eviction Strategies: LRU vs LFU"
track: caching
module: architecture
level: intermediate
duration: 25
prerequisites: [foundations-latency-throughput]
concepts: [cache-aside, read-through, write-through, write-back, lru, lfu, ttl, eviction-policies]
tags: [caching, performance, redis, memcached, eviction]
interactive:
  type: cache-simulator
  enabled: true
order: 1
---

# Caching Topologies and Eviction Strategies

Caching is the practice of storing precomputed or frequently requested data in fast, volatile memory (RAM) to avoid expensive disk lookups, CPU computations, or external API calls.

Because RAM costs roughly 10x more per gigabyte than NVMe SSDs, caches are strictly finite in capacity. An architect must master both **caching topologies** (how data moves between cache and database) and **eviction policies** (which data to purge when memory fills up).

---

## 1. Caching Topologies

How your application code interacts with the cache layer dictates consistency, failure recovery, and write latency.

### 1. Cache-Aside (Lazy Loading)
The application code coordinates both cache and persistent database directly:
1. Application queries Cache.
2. If **Cache Hit**: Return data immediately.
3. If **Cache Miss**: Application queries Database, populates Cache with retrieved row, and returns data to user.

```
Application ──(1. Check Cache)──► Redis / Memcached
     │
     └──(2. On Miss: Read DB)──► PostgreSQL / MySQL
     │
     └──(3. Populate Cache)────► Redis / Memcached
```
- **Pros**: Resilient against cache outages (if Redis crashes, requests simply fall back directly to the DB).
- **Cons**: Cache misses incur 3 round-trips. Risk of stale data if application writes to DB without updating or invalidating the cache.

---

### 2. Read-Through
The application queries **only** the cache abstraction layer. The cache itself is responsible for intercepting misses, loading data from the underlying database, caching it, and returning it transparently.

---

### 3. Write-Through
The application writes data exclusively to the cache. The cache synchronously writes the update to the persistent database before returning success:
- **Pros**: Cache and persistent database are guaranteed to be in sync. Data is immediately available for subsequent reads.
- **Cons**: Every write operation pays the penalty of both cache memory write and synchronous database disk write latency.

---

### 4. Write-Back (Write-Behind / Asynchronous Flushing)
The application writes data to the fast in-memory cache and receives an immediate acknowledgment. A background worker periodically flushes batched dirty writes from cache RAM down to the persistent database:
- **Pros**: Blazing fast write latency and high throughput (thousands of increment updates to a counter are coalesced into a single DB query).
- **Cons**: **Risk of permanent data loss** if the cache server crashes or loses power before the background flush executes.

---

## 2. Eviction Policies: LRU vs LFU

When cache memory reaches its configured threshold (e.g., Redis `maxmemory 8gb`), the cache engine must evict existing entries to make room for incoming writes.

### Least Recently Used (LRU)
- **Concept**: Discards the item that has not been accessed for the longest period of time.
- **Mental Model**: Items are arranged in a timeline. Every time an item is read or written, it moves to the front. Eviction removes items from the tail.
- **Optimal For**: Temporal locality (items accessed recently are highly likely to be accessed again soon).
- **Failure Mode**: A one-time full-table analytical batch scan will sweep through every key once, evicting the entire working set of hot items!

### Least Frequently Used (LFU)
- **Concept**: Tracks an access counter for each key and evicts items with the lowest cumulative reference count.
- **Optimal For**: Skewed Pareto workloads (e.g. 80/20 rule where the top 10% of items receive 80% of persistent traffic).
- **Failure Mode**: An item that received 100,000 hits during a flash sale will linger in the cache forever even after the sale ends because its historical frequency counter remains artificially high. Requires **counter decay** algorithms (as implemented in Redis LFU).

---

## Interactive Simulation

Use the **Cache Hit Rate and Eviction Simulator** above to:
1. Adjust cache capacity relative to total key space.
2. Toggle between **Pareto 80/20 Skewed** access patterns and **Uniform Random** access patterns.
3. Compare hit rates and database queries saved between **LRU** and **LFU** eviction strategies.
