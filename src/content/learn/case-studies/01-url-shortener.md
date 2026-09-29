---
id: case-study-url-shortener
title: "Deep Dive: Building a URL Shortener from Simple to Global Scale"
track: case-studies
module: url-shortener
level: all
duration: 30
prerequisites: [foundations-what-is-system-design]
concepts: [url-shortener, base62, id-generation, caching, replication, cdn, read-heavy-workload]
tags: [all, case-study, url-shortener, scaling, full-system]
interactive:
  type: architecture-evolution
  enabled: true
order: 1
---

# Deep Dive: Building a URL Shortener from Simple to Global Scale

This case study traces the evolutionary arc of a URL shortener — from the simplest solution that works, through each scaling crisis, to a globally distributed system. The goal isn't the final architecture. It's understanding every decision along the way.

---

## Version 1: The Simplest Thing That Works

```
Browser → Flask App → SQLite Database
```

```python
import sqlite3, hashlib, string

def shorten(url):
    hash_val = hashlib.md5(url.encode()).hexdigest()[:7]
    db.execute("INSERT INTO urls (code, original) VALUES (?, ?)", (hash_val, url))
    return f"https://short.ly/{hash_val}"

def redirect(code):
    row = db.execute("SELECT original FROM urls WHERE code = ?", (code,)).fetchone()
    return row["original"]
```

This works for a personal project. Deploy it on a $5 VPS and you're done.

**Where it breaks**: MD5 collisions. Two different URLs could produce the same 7-character hash. At small scale, this is unlikely. At millions of URLs, it becomes inevitable.

---

## Version 2: Better ID Generation

Replace MD5 with a counter-based approach. Use **Base62 encoding** (a-z, A-Z, 0-9) to convert a numeric ID into a short string:

```python
CHARS = string.ascii_letters + string.digits  # 62 characters

def encode_base62(num):
    if num == 0:
        return CHARS[0]
    result = []
    while num:
        result.append(CHARS[num % 62])
        num //= 62
    return ''.join(reversed(result))

# ID 1,000,000 → "4c92" (4 characters)
# ID 1,000,000,000 → "15FTGf" (6 characters)
```

With an auto-incrementing database ID, every URL gets a unique, short code. No collisions.

**Where it breaks**: The auto-increment ID is sequential. If your current URL has code "abc123", someone can guess that "abc122" and "abc124" exist. This is an information leak and a scraping vector.

**Fix**: Use a randomized counter. Pre-generate a pool of random IDs, or use a hash of the counter to scramble the output.

---

## Version 3: The Read/Write Split

URL shorteners are **extremely read-heavy**. Creating a short URL happens once. Redirecting (reading) happens thousands or millions of times.

Typical ratio: 100:1 reads to writes, often much higher.

**Add a cache**: Put Redis in front of the database. When a redirect request comes in, check Redis first. Cache hit → return immediately. Cache miss → read from database, populate cache, return.

```
Redirect path: Browser → App → Redis (cache hit: 0.5ms)
                                      ↓ (cache miss)
                              PostgreSQL (5ms)
```

With a 99% cache hit rate, 99% of redirect requests never touch the database. The database handles the remaining 1% plus all write traffic.

---

## Version 4: Multiple Servers and Load Balancing

A single server is a single point of failure. Add multiple application servers behind a load balancer:

```
Browser → Load Balancer → App Server 1 → Redis → PostgreSQL
                        → App Server 2 ↗       ↗
                        → App Server 3 ↗       ↗
```

The application servers are stateless — they just check Redis and query PostgreSQL. Any server can handle any request.

---

## Version 5: Database Scaling

At hundreds of millions of URLs, PostgreSQL on a single server approaches its limits. Options:

**Read replicas**: For the read-heavy workload, add PostgreSQL replicas. Cache misses go to replicas, not the primary.

**Sharding**: If the data volume exceeds one machine's storage, shard by the first character of the code or by a hash of the code. This distributes data across multiple database servers.

---

## Version 6: Global Distribution

Users in Tokyo experience 200ms latency to a US-based server. Unacceptable for a redirect that should be instant.

**CDN for redirects**: Configure the CDN to cache redirect responses. A redirect for code "abc123" returns the same Location header every time — it's perfectly cacheable. The CDN serves it from the nearest edge location in < 30ms.

**Multi-region deployment**: For very high traffic, deploy the application in multiple regions. Each region has its own Redis instance and database replica.

---

## The Final Architecture

```
User (anywhere) → CDN Edge (cache redirect) → Regional Load Balancer
                                              → App Servers (stateless)
                                              → Redis (read cache)
                                              → PostgreSQL Primary (writes)
                                              → PostgreSQL Replicas (read fallback)
```

Every component was added to solve a specific problem:
- **Redis**: Reduce database load for the 100:1 read-heavy workload
- **Load balancer**: Eliminate single points of failure
- **CDN**: Reduce global latency for static redirects
- **Replicas**: Handle read volume beyond single-server capacity

This is the key lesson of case studies: **architecture evolves in response to specific scaling pressures**, not from a template.
