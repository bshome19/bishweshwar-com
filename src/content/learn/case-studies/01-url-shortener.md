---
id: case-url-shortener
title: "Real-World Case Study: Designing a High-Scale URL Shortener"
track: case-studies
module: foundational-designs
level: beginner
duration: 40
prerequisites: [foundations-what-is-system-design, foundations-latency-throughput]
concepts: [url-shortener, base62, key-generation-service, 301-vs-302, id-generation, caching]
tags: [case-study, hld, system-design, scaling, base62]
order: 1
---

# Real-World Case Study: Designing a High-Scale URL Shortener

Designing a URL shortener (like TinyURL or Bitly) is the classic interview question that tests end-to-end distributed systems fundamentals: unique ID generation, caching topologies, read/write asymmetry, and database partitioning.

---

## 1. Requirements & Scale Estimation

### Functional Requirements
1. **Shortening**: Given a long URL, return a 7-character unique short link (e.g. `https://sho.rt/a8F1xY2`).
2. **Redirecting**: Accessing the short link immediately redirects the browser to the original destination.
3. **High Availability**: $99.99\%$ uptime; link redirects must never fail.
4. **Low Latency**: p99 redirect latency $< 15\text{ms}$.

### Scale Math (Back of the Envelope)
- **Traffic**: 100:1 read-to-write ratio.
  - New links created: $10,000,000\text{ writes/day} \approx \mathbf{115\text{ writes/sec}}$.
  - Link redirections: $1,000,000,000\text{ reads/day} \approx \mathbf{11,600\text{ reads/sec}}$ (Peak: $\approx 25,000\text{ QPS}$).
- **Storage (5 Years)**:
  - Total URLs = $10\text{M/day} \times 365 \times 5 = 18.25\text{ Billion records}$.
  - Storage per record: 500 bytes (Short Code, Long URL, Timestamp, User ID).
  - Total capacity: $18.25\text{B} \times 500\text{ bytes} \approx \mathbf{9.1\text{ Terabytes (TB)}}$.

---

## 2. Encoding and ID Generation: Why Base62?

We want our short URLs to use characters $[a-z, A-Z, 0-9]$ (total 62 characters).

How many unique URLs can a 7-character Base62 string represent?

$$62^7 = 3,521,614,606,208 \approx \mathbf{3.5\text{ Trillion unique URLs}}$$

3.5 Trillion combinations comfortably satisfies our 18.25 Billion requirement for decades.

### How to Generate Unique 7-Character IDs
1. **Naive MD5 / SHA256 Hashing of Long URL**:
   - `hash("https://example.com")` produces a 128-bit hash. Taking the first 7 characters causes **hash collisions**. Resolving collisions requires database lookups, slowing write latency.
2. **Auto-Increment Integer $\rightarrow$ Base62 Conversion**:
   - Convert a 64-bit auto-incrementing integer (e.g., ID `125193`) directly into Base62 (`"whb"`).
   - Guarantees **zero collisions** and instantaneous generation!

---

## 3. High-Level Architecture Topology

```
User (Browser)
     │
     ▼
Global Anycast CDN / Cloudflare (Edge Redirect Cache)
     │
     ▼
API Gateway / Load Balancer
     │
     ├──► Read Service (Redirects) ──► Redis Cache Cluster ──► Sharded DB
     │
     └──► Write Service (Creation) ──► Key Generation Service (KGS) ──► Primary DB
```

---

## 4. Architectural Deep Dives

### HTTP 301 vs 302: An Important Design Decision
- **HTTP 301 Moved Permanently**: The browser caches the redirect mapping permanently on the user's laptop. Subsequent clicks never hit our servers at all!
  - **Pro**: Drastically cuts server load and network costs.
  - **Con**: **Destroys click analytics tracking**. We cannot measure click counts, referrers, or user geolocations.
- **HTTP 302 Found (Temporary Redirect)**: The browser sends every click through our servers before redirecting.
  - **Pro**: Accurate real-time analytics and telemetry.
  - **Decision**: Use **HTTP 302** if monetization depends on analytics; use **301** if optimizing purely for infrastructure cost.

### Handling Hot Viral Links
If an influencer tweets a short URL, it might receive 50,000 QPS alone.
- Cache hot entries in **Redis Cluster** using the LRU eviction policy.
- Configure CDN Edge Caching with a short TTL (e.g., `Cache-Control: public, max-age=60`) to absorb 95% of traffic before it reaches your cloud datacenter.
