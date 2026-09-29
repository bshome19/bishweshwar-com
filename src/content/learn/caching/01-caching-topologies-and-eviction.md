---
id: caching-topologies-eviction
title: "Why Fast Systems Cache (And When Caches Lie)"
track: caching
module: caching-fundamentals
level: intermediate
duration: 22
prerequisites: [foundations-computer-architecture]
concepts: [caching, cache-aside, read-through, write-through, write-back, eviction, lru, lfu, ttl, cache-invalidation]
tags: [intermediate, caching, performance, memory-hierarchy, eviction-policies]
interactive:
  type: cache-simulator
  enabled: true
order: 1
---

# Why Fast Systems Cache (And When Caches Lie)

Your CPU has three caches (L1, L2, L3) that it didn't ask anyone's permission to build. Your operating system maintains a buffer cache of recently-read disk blocks. Your browser caches website resources. Your DNS resolver caches name lookups. Your CDN caches static assets at 200+ edge locations globally.

Nobody decided "let's add caching." Caching emerged everywhere because it's a response to a universal physical law: **fast storage is expensive and small; cheap storage is slow and large**.

If you want to serve 100,000 requests per second from a database that can handle 1,000 queries per second — math says that won't work. You need to serve most requests from somewhere faster, and that somewhere is a cache.

Understanding caching isn't about learning the patterns (cache-aside, read-through, write-back). It's about understanding why those patterns exist — what problem they solve, what problem they create, and when to use each.

---

## The Memory Hierarchy, Again

We covered this in the foundations track, but it's worth repeating with caching specifically in mind:

```
Your cache layer       │  ~0.5ms round trip (Redis, in datacenter)
Your database on SSD   │  ~1-5ms per query
Your database on HDD   │  ~10-20ms per query
Across the internet    │  ~50-200ms per request
```

A Redis lookup for a key is roughly 0.5ms. A database query might be 5ms (10x slower) to 20ms (40x slower). For complex queries with joins and full table scans: much worse.

If you can answer a request from cache, you get:
- Dramatically lower latency
- Reduced load on the database
- Ability to serve far more requests per second

The trade-off: cached data might be **stale** — it reflects the state of the world at the moment it was cached, not the current state.

This is the core tension in every caching decision: **speed vs freshness**. Cache hit = fast and possibly stale. Cache miss = slow and definitely fresh.

---

## Cache Aside: The Default Pattern

The most common caching pattern in web applications is **cache-aside** (also called "lazy loading").

```
On a read request:
1. Check cache for key
2. If found (cache hit): return cached value
3. If not found (cache miss):
   a. Read from database
   b. Store result in cache
   c. Return to client
```

The application code manages the cache explicitly. The cache sits "beside" the database — hence "cache-aside."

```python
def get_user(user_id):
    cache_key = f"user:{user_id}"
    
    # Check cache first
    cached = redis.get(cache_key)
    if cached:
        return deserialize(cached)
    
    # Cache miss: load from database
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # Store in cache for next time
    redis.setex(cache_key, 3600, serialize(user))  # TTL: 1 hour
    
    return user
```

**What cache-aside is good at**:
- Read-heavy workloads where the same data is requested repeatedly
- Situations where you can tolerate some staleness
- Simple implementation — the cache layer is just a lookup optimization

**What cache-aside fails at**:
- A fresh cache (or cache restart) means every request is a miss — everyone hits the database simultaneously. This is the **cold start problem**.
- If many users request the same uncached key simultaneously (before it's loaded), they all hit the database. This is the **thundering herd** (covered in the next lesson).

The **TTL** (Time To Live) is the lifeline that controls staleness. Set it short (60 seconds) and cached data is fresh but cache miss rates are high. Set it long (24 hours) and you get great cache hit rates but users might see very stale data.

Choosing the right TTL is a product decision: what level of staleness is acceptable for this specific data?

---

## Read-Through: Hiding Complexity in the Cache Layer

**Read-through** caching is similar to cache-aside, but the cache layer itself is responsible for loading from the database on misses — your application code only ever talks to the cache.

```
Application → Cache Layer → (on miss) → Database → Cache Layer → Application
```

The application asks the cache for data. If it's not there, the cache (not the application) fetches from the database and caches it. The application always gets a value; it never knows if it was a cache hit or miss.

**Advantages**:
- Cleaner application code — no cache logic in your business logic
- Cache is the single source of truth from the application's perspective

**Disadvantages**:
- The cache layer becomes more complex
- First request after cache miss is still slow (database fetch)
- Less control from the application (sometimes you want to know if it was a cache hit)

Read-through is common in caching frameworks like ActiveRecord caching in Rails, or Hibernate second-level caches in Java.

---

## Write-Through: Keeping Cache and Database Synchronized

When a user updates data, what do you do with the cache?

In cache-aside/read-through, the cache entry either expires (by TTL) or gets invalidated explicitly. But what if you want the cache to always be up to date?

**Write-through** caching updates the cache and the database simultaneously:

```
On write:
1. Write to cache
2. Write to database
3. Return success to client (after both succeed)
```

Both writes happen together. The cache is always in sync.

**Advantages**:
- Cache is never stale — reads always get the current value
- No cache invalidation logic needed

**Disadvantages**:
- Writes are slower — you're doing two writes instead of one
- Every written value gets cached, even values that will never be read. This wastes cache space.
- If the database write fails after the cache write, you have inconsistency

Write-through is great for read-heavy workloads where you absolutely need to minimize stale reads and can accept slower writes.

---

## Write-Back (Write-Behind): Optimizing Write Speed at the Cost of Durability

**Write-back** flips the order: write to cache first, return success to the client immediately, and asynchronously flush to the database later.

```
On write:
1. Write to cache
2. Return success immediately ← client is done
3. (Later, asynchronously) Write to database
```

**Advantages**:
- Writes are extremely fast — just a cache write, no database I/O on the hot path
- Multiple writes to the same key can be batched — if you update the same record 100 times per second, only the final value needs to be written to the database

**Disadvantages**:
- **Durability risk**: If the cache server crashes before the async database write, those writes are **permanently lost**
- **Complex failure handling**: The cache needs to be treated as durable (with its own replication and persistence)

Write-back is used in extreme write-heavy scenarios where you're willing to risk small amounts of data loss for write throughput. HDD controllers use write-back internally. Some databases use it for hot tables. Redis with AOF (Append-Only File) provides a form of this.

The question to ask before using write-back: **can we tolerate losing the last N seconds of writes?** If yes, it might be appropriate.

---

## Cache Eviction: What Happens When the Cache Is Full

A cache has finite size. Eventually, the cache is full and you need to add a new item. Something has to be removed. Which item?

This is the **eviction policy** question, and it matters more than most people think.

**LRU (Least Recently Used)**: Evict the item that was accessed least recently.

The intuition: recently used items are likely to be used again soon. Items not accessed for a long time probably won't be accessed again soon. LRU is the closest approximation to "evict the item least likely to be needed again."

Implementation: maintain a doubly-linked list ordered by recency, plus a hash map for O(1) lookup. On access, move the item to the front. When full, evict the item at the back.

LRU is the most common eviction policy for general-purpose caches (Redis by default, Memcached options).

**LFU (Least Frequently Used)**: Evict the item that has been accessed the fewest times overall.

The intuition: frequently accessed items are likely popular. Items accessed rarely are less valuable to keep.

LFU handles "scan" workloads better than LRU: if you iterate through 1 million items once (touching each one exactly once), LRU would evict your most popular items to make room, while LFU would keep the frequently accessed hot items.

But LFU has a "recency problem": an item that was very popular 6 months ago but hasn't been accessed since still has a high frequency count. LFU won't evict it even though it's essentially dead. Windowed LFU (LFU over a sliding time window) addresses this.

**FIFO (First In, First Out)**: Evict the oldest item. Simple, but ignores access patterns entirely — an item added 10 days ago and accessed 1,000 times per day might be evicted before an item added yesterday and never accessed.

**Random**: Evict a random item. Surprisingly effective in practice for some access patterns, and trivially simple to implement.

**For most web application caches: use LRU**. It's correct for most workloads and has excellent implementation support.

---

## Cache Invalidation: The Hard Problem

There's a famous quote in computer science:

> "There are only two hard things in Computer Science: cache invalidation and naming things."
> — Phil Karlton

Cache invalidation is: when should a cached value be considered stale and evicted?

The answer seems obvious: when the underlying data changes. But implementing this correctly is genuinely difficult.

**TTL-based expiration**: The simplest approach. Set a TTL when caching a value. After TTL expires, the next access is a cache miss and refreshes from the database.

Problem: data can change well before the TTL expires. If a user updates their profile picture and the cache TTL is 1 hour, they (and everyone else) will see their old profile picture for up to an hour.

**Active invalidation**: When data changes in the database, explicitly delete (or update) the cache entry.

```python
def update_user(user_id, new_data):
    db.update("UPDATE users SET ... WHERE id = ?", user_id, new_data)
    redis.delete(f"user:{user_id}")  # Invalidate cache
```

This sounds simple, but it has a subtle race condition:

1. Request A: reads user 42 from DB → value: "alice"
2. Concurrent write: updates user 42 → value: "alice2"
3. Concurrent write: invalidates cache for user 42
4. Request A: writes "alice" (stale!) to cache  ← Race condition!

Now the cache has the stale value "alice" even though the database has "alice2". The invalidation happened before the cache was repopulated with stale data.

The fix: use **version tags** or **compare-and-set** operations when writing to cache. Or use **event-driven invalidation** via Change Data Capture (CDC), where database changes emit events that invalidate the relevant cache keys — decoupling the write path from the cache.

**The deeper problem**: In a complex system, the same piece of data might be cached in multiple places: a user object in Redis, their name embedded in a "post" object, their avatar URL in a CDN. When the user changes their name, you'd need to invalidate all of these caches. Knowing where a piece of data is cached — across multiple layers and services — is a genuinely hard problem.

This is why data with complex caching dependencies is often given very short TTLs ("good enough freshness") rather than trying to actively invalidate every dependent cache. The complexity isn't worth it for data that changes rarely.

---

## The Cache Is a Bet

Every cache is a bet: **this data will be requested again before it changes**.

When the bet pays off: cache hit, fast response, reduced database load.

When the bet fails: cache miss (request is slower, database is queried), or worse, stale data served to users.

Cache design is the art of making better bets. You look at your access patterns (what's requested most often?), your data change patterns (how often does this change?), and your staleness tolerance (what level of stale data is acceptable?), and you design your cache accordingly.

Some bets are easy: DNS records (change rarely, requested constantly, small data). Static images on a website (never change, requested constantly). A user's profile data (changes occasionally, requested frequently).

Some bets are hard: shopping cart contents (changes frequently, must be accurate), inventory levels during a sale (changes very rapidly, staleness causes real problems — you might sell more than you have).

For hard bets, you might choose not to cache, or to cache with very short TTLs, or to use write-through so the cache is always current.

In the next lesson, we'll look at two failure modes that happen when caches are used at scale: the **thundering herd** (when a cache miss causes everyone to hit the database at once) and **cache stampedes** (a similar problem with different timing). These aren't edge cases — they're the rule at large scale, and defending against them requires specific design patterns.
