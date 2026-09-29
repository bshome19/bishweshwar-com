---
id: scalability-capacity-planning
title: "How to Know If Your System Can Handle the Load"
track: scalability
module: capacity-math
level: advanced
duration: 22
prerequisites: [foundations-latency-throughput]
concepts: [capacity-planning, littles-law, qps, peak-load, storage-estimation, bandwidth, back-of-envelope]
tags: [advanced, scalability, capacity-planning, estimation, littles-law]
interactive:
  type: capacity-calculator
  enabled: true
order: 1
---

# How to Know If Your System Can Handle the Load

Here's a question that comes up constantly in engineering: "Will this handle our traffic?"

Not "theoretically" — will this specific configuration, with these many servers, these database settings, this cache size, this network bandwidth — will it handle the load we expect next month? Next year? During Black Friday?

The answer requires **capacity planning**: the practice of estimating the resources a system needs based on expected workload, and verifying those estimates before the load arrives.

This isn't precise science. It's informed estimation — back-of-the-envelope calculations that tell you whether you're in the right ballpark. Off by 2x? Fine, you'll tune. Off by 100x? You have the wrong architecture.

---

## Starting Point: What Are the Numbers?

Every capacity estimate starts with workload numbers. You can't plan capacity without knowing what you're planning for.

**Daily active users (DAU)**: How many unique users use the system per day?

**Actions per user**: How many of the key operation does each user perform? (page views, messages sent, searches, transactions)

**Peak-to-average ratio**: Traffic isn't uniform. Peak traffic (during evenings, product launches, or holiday sales) is typically 2-5x the average. Plan for peak, not average.

**Data volume**: How much data does each action generate? How fast does total storage grow?

Let's work through a concrete example: a social media feed service.

**Given**:
- 10 million DAU
- Each user views their feed 5 times per day
- Each feed request returns 20 posts
- Average post size: 1 KB (text + metadata, images served from CDN)

**Calculations**:

**Requests per day**: 10M users × 5 views = 50 million feed requests per day

**Average QPS (queries per second)**: 50M / 86,400 seconds ≈ 580 QPS

**Peak QPS**: 580 × 3 (peak multiplier) ≈ 1,740 QPS

**Bandwidth**: 1,740 requests/second × 20 posts × 1 KB = 34 MB/second outbound at peak

Now you can reason: Can a single server handle 1,740 requests per second? A well-optimized server with cached data, probably yes. But you'd want multiple servers for redundancy (a single server is a single point of failure). Three servers give you headroom and fault tolerance.

**Storage**: 10M users × 3 posts per day (created, not just viewed) × 1 KB = 30 GB/day of new data. That's ~11 TB/year. Your database planning needs to account for this growth.

---

## Little's Law in Practice

Remember Little's Law from the Foundations track:

```
L = λ × W
```

**L** = concurrent items in the system
**λ** = arrival rate
**W** = time each item spends in the system

This is extraordinarily useful for capacity planning:

**Database connection pools**: Your API handles 1,000 QPS. Each database query takes 20ms (W = 0.02s). Therefore L = 1000 × 0.02 = **20 concurrent database queries**. You need at least 20 connections in your pool. With safety margin: 40-50.

**Thread pools**: Your web server receives 2,000 requests/second. Each request takes 100ms to process (including downstream calls). L = 2000 × 0.1 = **200 concurrent requests**. You need at least 200 threads (or equivalent async capacity). With headroom: 300-400.

**Queue sizing**: Messages arrive at 500/second. Processing takes 200ms each. L = 500 × 0.2 = **100 messages in-flight at any time**. Your consumer pool needs to handle 100 concurrent processing tasks.

Little's Law turns fuzzy "do we have enough capacity?" questions into concrete arithmetic.

---

## The Key Resources to Estimate

**CPU**: How many CPU-seconds of processing does each request require? If each request uses 10ms of CPU, and your server has 8 cores, you can handle 800 requests/second per server (ignoring I/O waits).

**Memory**: How much RAM does your application need? The working set of cached data + in-flight request state + application overhead. If your cache needs 16GB and your application uses 4GB, you need servers with at least 24GB RAM (with headroom).

**Disk I/O**: How many disk reads and writes per second? SSDs handle ~10,000-100,000 IOPS. HDDs handle ~100-200 IOPS. If your database does 5,000 random reads per second, you need SSDs — HDDs can't keep up.

**Network bandwidth**: How much data enters and leaves each server per second? A 1 Gbps network link supports ~125 MB/s. If each response is 50 KB and you serve 5,000 responses/second, that's 250 MB/s — you need a 10 Gbps link.

**Storage growth**: How fast does your data grow? A system generating 1 GB/day needs 365 GB/year. With replication factor 3, that's 1.1 TB/year of raw storage. Plan for 2-3 years of growth.

---

## Back-of-the-Envelope Math: Useful Approximations

Keep these in your head for quick estimation:

```
Seconds in a day:     ~86,400  (round to ~100,000 for estimation)
Seconds in a month:   ~2.5 million
Seconds in a year:    ~30 million

1 million QPS for a day = ~86 billion requests
1 KB × 1 million = 1 GB
1 KB × 1 billion = 1 TB
1 KB × 1 trillion = 1 PB
```

**Powers of 2 for storage**:
```
2^10 = 1 KB (1,024)
2^20 = 1 MB (1,048,576)
2^30 = 1 GB
2^40 = 1 TB
2^50 = 1 PB
```

**Network throughput**:
```
1 Gbps = ~125 MB/s of actual payload
10 Gbps = ~1.25 GB/s
```

These approximations let you do quick sanity checks. "Can this handle 100,000 QPS?" → 100K requests × 10ms each = 1000 CPU-seconds per second of real time → need at least 1000 CPU cores → roughly 125 eight-core servers. That's not crazy, but it's a significant fleet. Is the architecture right for this scale?

---

## The Scaling Calculation: When Do We Hit the Wall?

The most valuable capacity planning question is: **at our current growth rate, when do we hit the limits of our current architecture?**

**Example**: Your database server handles 5,000 QPS with acceptable latency. Your traffic is growing 20% per month. You're currently at 2,000 QPS.

```
Month 0:  2,000 QPS
Month 1:  2,400 QPS
Month 2:  2,880 QPS
Month 3:  3,456 QPS
Month 4:  4,147 QPS
Month 5:  4,977 QPS  ← approaching limit
Month 6:  5,972 QPS  ← over limit
```

You have about 5 months before you need to either optimize or scale. That's your planning horizon.

This is why capacity planning is done regularly, not once. Growth rates change. New features change the workload profile. Infrastructure costs change.

---

## Load Testing: Verifying Your Estimates

Back-of-the-envelope calculations tell you if you're in the right ballpark. **Load testing** tells you if the real system actually handles the load.

**Types of load testing**:

**Stress test**: Gradually increase load until the system breaks. Find the breaking point. This tells you your actual maximum capacity.

**Soak test**: Run at expected peak load for an extended period (hours). Find problems that only appear under sustained load: memory leaks, connection pool exhaustion, disk filling up.

**Spike test**: Suddenly jump to 10x normal load. Simulate a flash sale or viral event. Does the system handle the spike, or does it collapse?

**Tools**: k6, Locust, Gatling, Artillery, Apache JMeter. Modern tools let you define realistic user scenarios (browse products → add to cart → checkout) and simulate thousands of concurrent users.

**The critical rule**: Load test against a production-like environment. Testing against a local laptop tells you nothing about how the system behaves with network latency, real database sizes, and production-like concurrency.

---

## The Practical Takeaway

Capacity planning isn't about getting exact numbers. It's about answering three questions:

1. **Are we in the right order of magnitude?** Can our current architecture handle the expected load at all? If we need 50,000 QPS and our database maxes at 5,000, no amount of tuning will fix the gap. We need a different approach (caching, sharding, etc.).

2. **When do we hit the wall?** At current growth, how many months until our current resources are insufficient? This determines your planning urgency.

3. **What's the bottleneck?** CPU? Memory? Disk I/O? Network? Database connections? Knowing the bottleneck tells you what to optimize or scale.

In the next lesson, we'll look at how to actually break through those walls — horizontal scaling, the specific bottlenecks that emerge at each scale tier, and the architectural changes required at each order-of-magnitude growth.
