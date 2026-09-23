---
id: scalability-horizontal-scaling-and-bottlenecks
title: "Horizontal Scaling and Identifying System Bottlenecks"
track: scalability
module: scaling-patterns
level: intermediate
duration: 25
prerequisites: [scalability-capacity-planning-and-littles-law]
concepts: [horizontal-scaling, vertical-scaling, statelessness, stateful-services, bottlenecks, amdahls-law]
tags: [scalability, architecture, horizontal-scaling, stateless, performance]
order: 2
---

# Horizontal Scaling and Identifying System Bottlenecks

"Just scale horizontally" is the most repeated advice in system design. Yet in practice, adding more application servers often does not increase overall system throughput—and can even decrease it due to downstream lock contention.

---

## 1. The Prerequisite for Horizontal Scaling: Statelessness

You cannot scale a service horizontally behind a load balancer if individual server nodes maintain private in-memory session state:

```
BAD: Stateful Server Nodes
User A ──(Login)──► App Server #1 [Session in RAM]
User A ──(Next Req)─► App Server #2 [No Session! Force Logout!]

GOOD: Shared Ephemeral State Store
User A ──► Load Balancer ──► Any Stateless App Server ◄──► Redis / Memcached Cluster
```

### Decoupling State
To make a service truly stateless:
- **Session Tokens**: Use cryptographically signed JWTs or store opaque session keys in an external Redis cluster.
- **File Uploads**: Never write uploaded user files to local server disk storage. Stream files directly to cloud object storage (S3 / GCS) using pre-signed upload URLs.
- **WebSocket State**: Decouple persistent socket connections by publishing messages across a Redis Pub/Sub or Kafka backplane so messages reach users regardless of which server holds their TCP socket.

---

## 2. Amdahl's Law and Diminishing Returns

Why doesn't doubling the number of servers always double throughput?

**Amdahl's Law** states that the maximum speedup of a parallel system is bounded by the proportion of the task that is strictly sequential (serialized):

$$S_{\text{latency}}(s) = \frac{1}{(1 - p) + \frac{p}{s}}$$

Where $p$ is the fraction of work that can be parallelized, and $s$ is the speedup factor.
- If **5% of your request** requires a sequential database lock:
- Even if you provision **1,000,000 servers**, the maximum possible speedup is capped at:

$$\frac{1}{0.05 + 0} = \mathbf{20\times}$$

You cannot buy your way past sequential database bottlenecks by throwing more compute at the problem.

---

## 3. The 4 Universal Hardware Bottlenecks

When a distributed system hits a performance ceiling, it is always constrained by one of four physical resources:

1. **CPU Saturation**: Caused by JSON serialization/deserialization, cryptographic hashing (bcrypt/TLS), complex regex parsing, or heavy business computation.
2. **Memory (RAM) Exhaustion**: Caused by unbounded cache growth, thread stack allocation explosions, or JVM garbage collection stop-the-world pauses.
3. **Storage I/O (Disk IOPS & Bandwidth)**: Caused by random disk seeks in B-trees, unindexed SQL queries, or disk fsync write stalls.
4. **Network I/O & Egress Saturation**: Caused by network interface card (NIC) bandwidth limits, socket buffer starvation, or cloud provider cross-AZ egress bandwidth caps.
