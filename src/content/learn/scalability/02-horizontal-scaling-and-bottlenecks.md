---
id: scalability-horizontal-scaling
title: "Breaking Through Bottlenecks: The Stages of Scaling"
track: scalability
module: scaling-architecture
level: advanced
duration: 22
prerequisites: [scalability-capacity-planning]
concepts: [horizontal-scaling, vertical-scaling, bottleneck, stateless-services, connection-pooling, read-replicas, cdn, auto-scaling]
tags: [advanced, scalability, horizontal-scaling, bottlenecks, architecture, growth]
interactive:
  type: scaling-simulator
  enabled: true
order: 2
---

# Breaking Through Bottlenecks: The Stages of Scaling

Every system goes through a predictable sequence of scaling crises as it grows. The specific technologies change, but the pattern is remarkably consistent: you hit a bottleneck, you solve it, and the load shifts to expose the next bottleneck.

Understanding this sequence — knowing what breaks at each order of magnitude — is the skill that lets you plan architecturally instead of reacting to fires.

---

## Stage 0: The Single Server (0 - 100 users)

```
Users → Web Server + Database (same machine)
```

Everything runs on one machine. Your web application and your database share a single server. This is correct for small applications — it's the simplest possible architecture, the easiest to debug, and costs $5-20/month.

**What breaks first**: Nothing, for a long time. A single modern server can handle surprising amounts of traffic if the application is well-written. Don't prematurely optimize.

**When to move on**: When you realize that a single machine is a single point of failure. If it goes down, everything goes down. The first scaling step is usually about reliability, not performance.

---

## Stage 1: Separate the Database (100 - 10,000 users)

```
Users → Web Server ──► Database Server
```

Move the database to its own machine. Now they don't compete for CPU and memory.

**Why**: The web server and database have different resource profiles. The web server needs CPU for request handling; the database needs RAM for caching data pages and I/O bandwidth for disk reads. On the same machine, they fight over resources. Separating them lets you size each independently.

**What breaks next**: The web server becomes a single point of failure and a performance bottleneck.

---

## Stage 2: Add a Load Balancer and Multiple Web Servers (10,000 - 100,000 users)

```
Users → Load Balancer → Web Server 1
                      → Web Server 2
                      → Web Server 3
                      ↓
                   Database Server
```

Multiple web server instances behind a load balancer. If one web server crashes, the others continue serving. You can handle more requests by adding more servers.

**The critical requirement**: Your web servers must be **stateless** — they cannot store any user-specific data in memory (sessions, shopping carts, etc.). If a user's first request goes to Server 1 and their second request goes to Server 2, Server 2 must be able to handle it without knowing what Server 1 did.

Where does the state go? To the database, to Redis (for sessions), or to the client (JWT tokens with embedded data). The pattern: **push state out of the application tier into a shared store**.

**What breaks next**: The database.

---

## Stage 3: Database Reads Are the Bottleneck — Add Caching and Read Replicas

```
Users → Load Balancer → Web Servers → Cache (Redis)
                                    → Primary Database
                                    → Read Replica 1
                                    → Read Replica 2
```

Most applications are read-heavy (90%+ reads). Two tools help:

**Caching layer (Redis/Memcached)**: Store frequently-accessed data in memory. Cache hit rates of 90-99% mean 90-99% of read traffic never touches the database.

**Read replicas**: Copies of the primary database that serve read queries. Writes go to the primary; reads are distributed across replicas.

Together, these can reduce database load by 95% or more.

**What breaks next**: At very high write volumes, the primary database becomes the bottleneck (all writes go to one machine). Or your data grows too large for a single machine.

---

## Stage 4: Database Writes Are the Bottleneck — Sharding

```
Users → Load Balancer → Web Servers → Cache
                                    → Shard 1 (users A-M)
                                    → Shard 2 (users N-Z)
```

Sharding (covered deeply in the Databases track) splits data across multiple machines. Write throughput scales with the number of shards. Data capacity scales with the number of shards.

**The cost**: Cross-shard queries become expensive or impossible. Application logic must be shard-aware. Operational complexity increases significantly.

**What breaks next**: At global scale, latency for users far from your datacenter becomes unacceptable.

---

## Stage 5: Global Distribution — CDNs and Multi-Region

```
Users (US) → CDN (US edge) → US Datacenter → US Database Cluster
Users (EU) → CDN (EU edge) → EU Datacenter → EU Database Cluster
Users (Asia) → CDN (Asia edge) → Asia Datacenter → Asia Database Cluster
```

**CDN**: Serve static assets (images, CSS, JS) from edge servers close to users. A user in Tokyo loads images from a Tokyo edge node, not from your US datacenter.

**Multi-region deployment**: Run your full application stack in multiple geographic regions. Users connect to the nearest region. Each region has its own database, with cross-region replication for data that needs to be globally consistent.

**The cost**: Cross-region consistency is the hardest problem in distributed systems. How do you handle a user who signs up in the US region and immediately accesses the service from the EU region? Does the EU region know about them yet?

---

## The Connection Pool: A Bottleneck Nobody Sees Coming

One of the most common scaling surprises is **database connection exhaustion**.

A PostgreSQL server typically supports a few hundred to a thousand concurrent connections (depending on configuration). Each connection consumes RAM on the database server (~5-10 MB each).

With 10 web servers, each maintaining a connection pool of 20 connections, that's 200 connections. Add read replicas, background workers, analytics queries — you can easily exceed the connection limit.

**The fix**: A connection pooler like **PgBouncer** sits between your application and the database. It maintains a small pool of real database connections and multiplexes thousands of application connections onto them. An application "connection" is actually a lightweight session that gets a real connection only when it's actively running a query.

```
Without pooler:
  10 web servers × 20 connections = 200 database connections (real)

With PgBouncer:
  10 web servers × 20 connections → PgBouncer → 50 database connections (real)
```

PgBouncer can reduce the number of real database connections by 4-10x, which can postpone a database scaling crisis by months or years.

---

## Stateless Services and the Twelve-Factor App

The key architectural insight that makes horizontal scaling possible: **separate state from computation**.

Your web application should be a pure function of its inputs (the HTTP request + data from external stores). It should not store any state locally — no local file writes that matter, no in-memory caches that can't be lost, no session data in process memory.

This is because horizontally-scaled services can be killed and restarted at any time. Auto-scalers add and remove instances based on load. If an instance holds state, that state is lost when the instance is removed.

The **Twelve-Factor App** methodology (originally from Heroku) codifies this:
1. **Store config in environment variables** (not in code)
2. **Treat backing services as attached resources** (database URLs, cache endpoints — all configurable)
3. **Export services via port binding** (the app is self-contained)
4. **Scale out via processes** (add more instances, don't make instances bigger)
5. **Disposability**: Instances can be started and stopped quickly

---

## Auto-Scaling: Responding to Load Automatically

Once your services are stateless, you can add **auto-scaling**: automatically adding or removing instances based on current load.

```
Metrics:
  CPU usage > 70% for 5 minutes → add 2 instances
  CPU usage < 30% for 10 minutes → remove 1 instance
  Request queue depth > 100 → add 1 instance
```

**Scaling policies should be asymmetric**: Scale up aggressively (don't wait to add capacity when load is spiking) but scale down conservatively (wait longer before removing capacity to avoid flapping — where you repeatedly add and remove instances).

**Predictive scaling**: If your traffic follows a predictable pattern (high during business hours, low at night), pre-scale before the traffic arrives rather than reacting to it. AWS and GCP both support scheduled scaling policies.

---

## The Honest Scaling Hierarchy

When facing a performance problem, work through this hierarchy before reaching for distributed complexity:

1. **Optimize the code**: Is there a slow query? An N+1 problem? An unnecessary computation? This is the cheapest fix.

2. **Add an index**: Database queries that do full table scans can often be fixed by adding an appropriate index. Massive impact, minimal effort.

3. **Add caching**: A Redis cache in front of your database can handle 100x the read traffic.

4. **Vertical scaling**: Get a bigger machine. More RAM, faster CPU, faster disk. This works up to a point and is operationally simpler than distributing.

5. **Read replicas**: Distribute read load across multiple database copies.

6. **Horizontal scaling of stateless services**: Add more web server instances behind a load balancer.

7. **Sharding**: When single-machine database capacity is truly exhausted.

8. **Multi-region**: When global latency requirements demand it.

**Most applications never need to go past step 5 or 6.** Premature distribution — sharding a database that could fit on one machine, or building a microservices architecture for a 3-person team — adds complexity without benefit.

Scale when you have evidence that scaling is needed, not when you're afraid you might need it someday.
