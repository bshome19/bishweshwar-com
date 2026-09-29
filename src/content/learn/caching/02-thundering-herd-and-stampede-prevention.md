---
id: caching-thundering-herd
title: "The Thundering Herd: When Your Cache Fix Becomes Your Problem"
track: caching
module: cache-failure-modes
level: intermediate
duration: 18
prerequisites: [caching-topologies-eviction]
concepts: [thundering-herd, cache-stampede, probabilistic-early-expiration, request-coalescing, mutex-lock, jitter]
tags: [intermediate, caching, thundering-herd, cache-stampede, failure-modes]
interactive:
  type: thundering-herd
  enabled: true
order: 2
---

# The Thundering Herd: When Your Cache Fix Becomes Your Problem

Here's a scenario that happens constantly in production:

Your system serves 50,000 requests per second. Your database handles 500 queries per second. This works because your cache has a 99% hit rate — 49,500 requests per second are served from cache, and only 500 make it to the database.

One day, your caching server restarts. The cache is empty.

Suddenly, every request is a cache miss. All 50,000 requests per second hit the database. The database — designed for 500 queries per second — collapses under 100x its expected load. Response times spike from 5ms to 30 seconds. Timeouts cascade. The database falls over. Your entire system is down.

This is the **thundering herd** (also called **cache stampede**). And the brutal irony is that it often hits hardest on your most popular, most cached data — precisely because it's cached is why so much traffic piles up when the cache disappears.

Understanding why this happens, and how to prevent it, is essential for building systems that survive their own failure modes.

---

## Why the Herd Forms

Let's narrow the scenario. Instead of a full cache restart, consider a single key expiring.

You have a "featured products" list on your homepage. It's expensive to generate (10 database queries, complex aggregation, takes 500ms to build). You cache it with a 60-second TTL.

At 60-second intervals, this key expires. In the moments between expiry and the next cached version being built, every request for the homepage is a cache miss. If you have 10,000 requests per second hitting your homepage, that's potentially 10,000 concurrent 500ms database operations all trying to generate the same featured products list simultaneously.

Your database, designed for maybe 100 queries per second for this operation, suddenly gets 10,000.

This is a thundering herd on a single key. And it happens every 60 seconds, like clockwork.

---

## Solution 1: Mutex Lock (Request Coalescing)

The most obvious solution: when a cache miss happens, only let *one* request rebuild the cache. Every other concurrent request for the same key should **wait** for that first request to finish, then serve the result from cache.

```python
def get_featured_products():
    cache_key = "featured_products"
    
    cached = redis.get(cache_key)
    if cached:
        return deserialize(cached)
    
    # Cache miss: try to acquire lock
    lock = redis.set(
        "lock:featured_products",
        "1",
        nx=True,  # Only set if not exists (atomic)
        ex=5      # Lock expires after 5 seconds
    )
    
    if lock:
        # We got the lock: rebuild the cache
        result = build_featured_products()  # The expensive operation
        redis.setex(cache_key, 60, serialize(result))
        redis.delete("lock:featured_products")
        return result
    else:
        # Someone else is building it: wait and retry
        time.sleep(0.1)  # Wait 100ms
        return get_featured_products()  # Recursive retry
```

This works, but has issues:
- Waiting threads might timeout or stack up (if the rebuild takes longer than expected)
- If the lock holder crashes, the lock might expire and the next request triggers another rebuild
- The recursive retry approach can stack infinitely in the worst case

A better version uses a proper distributed lock (like Redlock) with a timeout, and serves slightly stale data during the rebuild period rather than blocking.

---

## Solution 2: Stale-While-Revalidate

A cleaner approach: **never let the cache go cold**. When a value is approaching expiry, serve the stale cached value while asynchronously refreshing it in the background.

```python
def get_featured_products():
    cache_key = "featured_products"
    stale_key = "featured_products:stale"
    
    cached = redis.get(cache_key)
    if cached:
        return deserialize(cached)  # Fresh, serve immediately
    
    # Primary key expired — check stale backup
    stale = redis.get(stale_key)
    
    if stale:
        # Serve stale data immediately; trigger async refresh
        trigger_background_refresh(cache_key)
        return deserialize(stale)  # Slightly stale, but instant
    
    # Both expired: rebuild synchronously (rare case)
    result = build_featured_products()
    redis.setex(cache_key, 60, serialize(result))
    redis.setex(stale_key, 300, serialize(result))  # Stale TTL is longer
    return result
```

With this pattern:
- `featured_products` expires every 60 seconds (fresh TTL)
- `featured_products:stale` expires every 300 seconds (fallback)
- When the primary key expires, requests get stale data while a background job refreshes the primary key
- The herd never forms — there's always something to serve

**Trade-off**: users occasionally see data that's 60-300 seconds stale. This is acceptable for "featured products" but not for real-time inventory counts.

HTTP has a built-in version of this concept: the `Cache-Control: stale-while-revalidate=N` header tells CDNs and browsers to serve stale content while refreshing in the background for up to N seconds.

---

## Solution 3: Probabilistic Early Expiration (XFetch)

This is an elegant mathematical approach to thundering herds.

Instead of waiting for a key to expire, each request has a small probability of deciding to **expire the key early** — specifically, requests made closer to the actual expiry time have a higher probability of triggering a refresh.

The algorithm (proposed by Vattani et al., 2015):

```python
import math, random

def get_with_xfetch(key, ttl, beta=1.0):
    cached, remaining_ttl = redis.get_with_ttl(key)
    
    if cached:
        # Time we have left before expiry
        delta = current_time() - last_set_time(key)  # Time since cached
        compute_time = estimate_recompute_time(key)  # How long rebuild takes
        
        # XFetch formula: expire early with probability proportional to proximity
        if delta - compute_time * beta * math.log(random.random()) >= ttl:
            # Probabilistically decide to expire early
            result = build_value()  # Rebuild
            redis.setex(key, ttl, result)
            return result
        
        return deserialize(cached)
    
    # Cold miss: build synchronously
    result = build_value()
    redis.setex(key, ttl, result)
    return result
```

The intuition: as a cached value ages, requests become increasingly likely to trigger an early refresh. By the time the official TTL expires, the cache has almost certainly already been refreshed — so no herd forms.

The `beta` parameter controls how aggressive early expiration is. Higher beta = more early refreshes (less likely to form a herd, but more database load overall).

This is statistically clever: the load from early refreshes is spread across many requests over time, rather than concentrated in one spike when the TTL expires.

---

## Solution 4: Jitter — The Simplest Herd Prevention

Here's the simplest technique of all, and yet it's remarkably effective.

**Jitter** means adding random variation to your TTL values.

Without jitter: you cache many items with TTL = 60 seconds. If many items were cached at the same time (e.g., during a warm-up after a cache restart), they all expire at the same time. Thundering herd.

With jitter: cache items with TTL = 60 seconds + random(0, 20) seconds. Now the 10,000 cached items don't all expire at once — they expire spread over a 20-second window. The spike becomes a manageable stream.

```python
import random

def cache_with_jitter(key, value, base_ttl):
    jitter = random.randint(0, base_ttl // 5)  # ±20% jitter
    redis.setex(key, base_ttl + jitter, serialize(value))
```

Jitter is a general technique for preventing synchronized behavior in distributed systems. You'll see it used for:
- Cache TTLs (prevent synchronized expiration)
- Retry intervals (prevent synchronized retries after failures)
- Health check intervals (prevent synchronized load on monitoring endpoints)
- Scheduled jobs (prevent synchronized database queries from cron)

Any time you have many things doing the same thing at the same time, adding randomness smooths the distribution.

---

## The Dog-Pile Effect: A Related Problem

The **dog-pile** (or "cache stampede") is a variant where the issue isn't TTL expiration but **a sudden cache miss on a cold key**.

Imagine: a blog post goes viral. Millions of users try to load it simultaneously. The post was just published — it's not cached yet. All million users simultaneously hit the database to fetch the post.

The solutions are the same as thundering herd prevention, but the context suggests an additional pattern: **pre-warming the cache**.

When you know something is about to become popular (a scheduled post, a flash sale, a product launch), you can pre-load it into cache before the traffic arrives:

```python
def publish_post(post_id):
    db.insert(...)        # Write to database
    post = db.get(post_id)
    redis.setex(f"post:{post_id}", 3600, serialize(post))  # Pre-warm cache
    # Now when traffic arrives, cache is already warm
```

This doesn't help for unpredictable virality (you can't predict when something will go viral). For that, the stale-while-revalidate and mutex lock patterns are more applicable.

---

## Monitoring for Thundering Herds

How do you detect a thundering herd in production?

Signs:
- **Cache miss rate spikes**: Sudden increase in cache misses (visible in Redis or Memcached metrics)
- **Database query spike**: A sudden 10-100x increase in queries to the database immediately after a cache restart or deployment
- **Latency spike with high variance**: p99 latency shoots up while p50 stays relatively lower (the "thunder" is hitting only the requests that miss cache)
- **Correlated error rates**: Database errors spike when cache miss rate spikes

In practice: track cache hit rate as a first-class metric. Alert when it drops significantly. A drop from 99% to 95% sounds small but means 5x the database load.

---

## The General Lesson: Caches Must Be Resilient to Their Own Failure Modes

Caches are added to protect databases from load. But a cache that's naively implemented can become the source of a catastrophic load spike the moment it misbehaves — restart, TTL expiry, eviction under pressure.

**Defensive caching** requires thinking through:
- What happens when the cache is completely empty? (Cold start defense)
- What happens when a popular key expires? (Thundering herd defense)
- What happens if the cache server goes down? (Circuit breaker to avoid overwhelming the database)
- What happens if the cache is under memory pressure and evicting aggressively? (Monitoring eviction rates)

These aren't exotic failure modes — they happen in every production system at sufficient scale. Designing defensively, with jitter, stale fallbacks, and request coalescing, turns these from catastrophic incidents into graceful degradations.

In the next track, we'll move from caching to messaging — what happens when synchronous communication isn't enough, and you need services to communicate asynchronously through queues and event streams.
