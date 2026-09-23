---
id: hld-end-to-end-hld-framework
title: "The 45-Minute High-Level Design (HLD) Interview Framework"
track: hld
module: framework
level: advanced
duration: 40
prerequisites: [foundations-latency-throughput, scalability-capacity-planning-and-littles-law]
concepts: [hld, system-design-interview, time-management, requirements-gathering, data-modeling, deep-dive]
tags: [hld, interviews, system-design, framework, career]
order: 1
---

# The 45-Minute High-Level Design (HLD) Interview Framework

A system design interview or architecture review is not an exam with a single correct answer. It is an evaluation of your ability to navigate ambiguous requirements, structure engineering trade-offs, communicate clearly, and design resilient distributed architectures under time constraints.

---

## 1. Time Allocation Breakdown (The 45-Minute Clock)

Managing time is the number one reason candidates fail system design interviews. Adhere strictly to this five-phase framework:

```
[Phase 1: Clarify & Scope]     ──► 5 mins   (Requirements & Scale Math)
[Phase 2: High-Level Diagram]  ──► 10 mins  (Core Client-Server Architecture)
[Phase 3: Data Modeling & API] ──► 10 mins  (Schemas & Communication Contracts)
[Phase 4: Deep Dive & Scale]   ──► 15 mins  (Bottlenecks, Caches, Sharding)
[Phase 5: Resiliency & Wrap]   ──► 5 mins   (Failures, Blast Radius, Metrics)
```

---

## 2. Phase 1: Clarify Requirements & Scope (0–5 Mins)

Never start drawing architecture boxes immediately. Ask clarifying questions to eliminate ambiguity:

### Functional Requirements (Scope Boundaries)
- Pick **2 to 3 core user features** and explicitly mark everything else out of scope:
  - *"In this 45-minute discussion, I will design: (1) URL shortening, and (2) URL redirecting with analytics. User authentication and custom vanity URL expiration will be considered secondary."*

### Non-Functional Requirements (SLAs & Numbers)
- **Scale**: Daily Active Users (DAU), Read/Write ratio (e.g. 100:1 read-heavy).
- **Latency**: p99 redirect latency $< 15\text{ms}$.
- **Consistency**: Is eventual consistency acceptable for analytics, or is strict serializability required?
- **Availability**: $99.99\%$ (Four Nines $\approx 52$ minutes downtime/year).

---

## 3. Phase 2: High-Level Architecture (5–15 Mins)

Draw the simplest working end-to-end baseline flow first, then iterate:

```
Clients (Web / Mobile)
       │
       ▼
Global DNS / Anycast CDN (Cloudflare / Fastly)
       │
       ▼
API Gateway / Reverse Proxy (Envoy / Nginx)
       │
       ├──► URL Shortening Service ──► Persistent Storage (PostgreSQL / DynamoDB)
       │
       └──► Redirect Service ───────► In-Memory Cache (Redis)
```

Walk through the happy path:
1. How a write travels from the client to persistent storage.
2. How a read travels through the cache and returns to the user.

---

## 4. Phase 3: Data Schema & API Design (15–25 Mins)

Define exact communication contracts and storage schemas:

### API Endpoints
- `POST /api/v1/urls`
  - Headers: `Idempotency-Key: uuid`
  - Body: `{"long_url": "https://..."}`
  - Returns: `{"short_url": "https://sho.rt/a8F1x"}`
- `GET /{short_code}`
  - Returns: HTTP `302 Found` with `Location: https://...` (or `301 Moved Permanently` if client caching is acceptable).

### Storage Model
- Choose Relational (PostgreSQL) vs NoSQL (DynamoDB / Cassandra) based on access patterns:
  - Do we need multi-table SQL joins and ACID transactions?
  - Or is the access pattern strictly single-key point lookups by `short_code`?

---

## 5. Phase 4 & 5: Deep Dive, Bottlenecks, and Fault Tolerance (25–45 Mins)

Probe the single points of failure (SPOF) and scaling limits:
1. **Cache Stampedes**: What happens when a viral tweet's URL expires from Redis? (Apply mutex locks or singleflight).
2. **Database Partitioning**: How do we shard the database when storage exceeds 20TB? (Consistent hashing on `hash(short_code)`).
3. **Multi-Region Disaster Recovery**: If an entire AWS region experiences a blackout, how does GeoDNS reroute traffic?
