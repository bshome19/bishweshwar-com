---
id: foundations-latency-throughput
title: "Latency vs Throughput: Two Numbers That Cause Half the Arguments"
track: foundations
module: mental-model
level: beginner
duration: 20
prerequisites: [foundations-what-is-system-design]
concepts: [latency, throughput, qps, littles-law, tail-latency, p99]
tags: [foundations, performance, metrics]
interactive:
  type: http-request-simulator
  enabled: true
order: 2
---

# Latency vs Throughput

In engineering discussions, people frequently conflate speed and capacity. These are two fundamentally different metrics governed by different physical constraints.

- **Latency** asks: *"How long did one single discrete operation take from initiation to completion?"* (Measured in milliseconds or microseconds).
- **Throughput** asks: *"How much total work can the entire system complete per unit of time?"* (Measured in Queries Per Second [QPS], Requests Per Second [RPS], or MB/s).

A helpful mental analogy is a pipeline or a highway:
- **Latency** is the time it takes for a single car to travel from Point A to Point B.
- **Throughput** is the number of cars that pass the finish line per minute.

Adding more lanes to the highway increases **throughput**, but does not make individual cars drive any faster (it does not reduce individual latency). However, if traffic is heavily congested, adding lanes relieves queueing delays, which indirectly improves perceived latency.

---

## Why Architects Care About Percentiles, Not Averages

Never rely on **average (mean) latency**. Averages hide catastrophic system failures.

Imagine an API serving 1,000 requests:
- 990 requests take 10ms.
- 10 requests get stuck in a database lock and take 10,000ms (10 seconds).
- **Average latency**: $(990 \times 10 + 10 \times 10,000) / 1000 = 109.9\text{ms}$.

An average of 109ms looks completely acceptable on a status dashboard. Yet in reality, 1 out of every 100 users experienced a frozen screen, and in a microservice topology where one user click triggers 50 internal fan-out RPCs, the probability of hitting a 10-second request approaches:

$$1 - (0.99)^{50} \approx 39.5\%$$

Almost 40% of all user requests would experience severe degradation!

### The Golden Latency Hierarchy

1. **p50 (Median)**: The latency experienced by the typical user.
2. **p95**: The 95th percentile—acceptable degradation under moderate load.
3. **p99**: The critical metric for high-scale backend services.
4. **p99.9 & Max**: The extreme tail caused by Garbage Collection (GC) pauses, network packet retransmissions, disk fsync stalls, or TCP SYN backoffs.

---

## The Concurrency Trap and Little's Law

Suppose an API endpoint takes an average of $50\text{ms}$ to execute. An engineer might conclude:
*"If each request takes 50ms, one server thread can process 20 requests per second. Therefore, our system can only handle 20 RPS."*

This is incorrect because modern operating systems and runtimes process requests **concurrently** using non-blocking I/O (epoll/kqueue) or thread pools.

The fundamental relationship between latency, throughput, and concurrency is described by **Little's Law**:

$$L = \lambda \times W$$

Where:
- $L$ = Average number of concurrent requests in-flight inside the system.
- $\lambda$ = Arrival rate / Throughput (requests per second).
- $W$ = Average response time / Latency (seconds).

### Practical Sizing Calculation

If your service needs to handle $\lambda = 5,000\text{ RPS}$ and each request has an average latency of $W = 40\text{ms} = 0.04\text{s}$:

$$L = 5,000 \times 0.04 = 200\text{ concurrent requests in-flight}$$

Your connection pools, memory allocations, and worker thread pools must be configured to comfortably hold at least 200 concurrent requests without queueing or blocking.

If downstream latency suddenly spikes from $40\text{ms}$ to $400\text{ms}$ due to database lock contention:

$$L = 5,000 \times 0.40 = 2,000\text{ in-flight requests!}$$

A 10x increase in latency causes a 10x explosion in open TCP sockets and server memory consumption. If your worker pool cap is 500, the system begins rejecting traffic with HTTP 503 or crashing from Out-Of-Memory (OOM) errors.

---

## Latency Numbers Every Systems Engineer Must Know

Formulated originally by Jeff Dean, these physical latency realities dictate every software architecture:

| Operation | Real Time | Scaled (Human Equivalent) |
| :--- | :--- | :--- |
| **L1 CPU Cache Reference** | $0.5\text{ ns}$ | $1\text{ second}$ |
| **Branch Mispredict** | $5\text{ ns}$ | $10\text{ seconds}$ |
| **L2 CPU Cache Reference** | $7\text{ ns}$ | $14\text{ seconds}$ |
| **Mutex Lock / Unlock** | $25\text{ ns}$ | $50\text{ seconds}$ |
| **Main Memory (RAM) Access** | $100\text{ ns}$ | $3.3\text{ minutes}$ |
| **Read 1 MB sequentially from RAM** | $250\text{ ns}$ | $8.3\text{ minutes}$ |
| **Read 1 MB sequentially from NVMe SSD** | $50\text{ µs}$ ($50,000\text{ ns}$) | $1.1\text{ days}$ |
| **Round trip within same datacenter** | $500\text{ µs}$ | $11.5\text{ days}$ |
| **Read 1 MB sequentially from HDD** | $20,000\text{ µs}$ ($20\text{ ms}$) | $1.5\text{ years}$ |
| **Send packet CA to Netherlands & back** | $150,000\text{ µs}$ ($150\text{ ms}$) | $9.5\text{ years}$ |

Reading from disk is thousands of times slower than RAM; traversing a trans-oceanic network cable is millions of times slower. This is why caching, connection pooling, and data locality dominate system design.

---

## Interactive Exploration

Use the **HTTP Request Simulator** at the top of this lesson to experiment with network Round-Trip Time (RTT), server processing latency, connection timeouts, and retry policies. Observe how retry amplification can transform a transient downstream delay into an uncontrollable cascading retry storm.
