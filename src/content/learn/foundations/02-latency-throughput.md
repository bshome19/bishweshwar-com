---
id: foundations-latency-throughput
title: "Latency & Throughput: Why 100ms Is Actually Forever"
track: foundations
module: performance-fundamentals
level: beginner
duration: 20
prerequisites: [foundations-what-is-system-design]
concepts: [latency, throughput, percentiles, queuing-theory, response-time]
tags: [beginner, foundations, performance, measurement]
interactive:
  type: latency-simulator
  enabled: true
order: 2
---

# Latency & Throughput: Why 100ms Is Actually Forever

Here's a question that seems obvious but has a surprising answer:

**What's the difference between a fast system and a slow one?**

"The fast one responds quicker" — yes, obviously. But *why* does one system respond quickly and another slowly? And how do you even measure "quickness" in a way that tells you something useful?

These questions lead to two of the most fundamental concepts in all of systems engineering: **latency** and **throughput**. They sound like jargon, but they're actually just precise names for two different things we mean when we say a system is "fast."

---

## What Latency Actually Is

Latency is **how long one thing takes**. A single request, a single query, a single operation. The time from "I sent the request" to "I got the response back."

When your browser loads a page, the latency is the time from pressing Enter to seeing the content. When an API call is made, the latency is the time that function call is blocking, waiting for a response.

Latency matters because **humans notice it**. And humans are more sensitive to latency than most engineers assume.

Research by Google and Microsoft found that:
- A **100ms** delay in page load reduced conversions by 1%
- A **1 second** delay reduced conversions by 7%
- A **3 second** delay — about what many people consider "a bit slow" — reduced conversions by 40%

And that's just e-commerce. In gaming, anything above 50ms in a latency-sensitive situation is noticeable. In trading systems, microseconds matter.

But here's the thing that surprised me when I first learned it: **100ms is not a moment**. It's a long time.

Light in a vacuum travels 300,000 km per second. At that speed, in 100ms, light could circle the Earth twice and a half. But in a fiber optic cable? Light travels at about 2/3 of its vacuum speed. A packet traveling from New York to London and back — about 11,000 km round trip — takes roughly 70ms at the speed of light. **Just the physics of the distance** consumes most of your latency budget before your code even runs.

This is why datacenter location matters. This is why CDNs (content delivery networks) exist. You can't beat physics by writing faster code.

---

## The Latency Numbers Everyone Should Know

You need these numbers living in your head. Not as trivia — as intuition. When you're designing a system and you think "we'll just look that up in the database," you need to instinctively know what that costs.

```
L1 cache reference:                    0.5 ns
Branch misprediction:                    5 ns
L2 cache reference:                      7 ns
Mutex lock/unlock:                      25 ns
Main memory reference:                 100 ns
Compress 1KB with fast algorithm:    3,000 ns
Send 1KB over 1 Gbps network:       10,000 ns
Read 4KB randomly from SSD:        150,000 ns   (0.15 ms)
Read 1 MB sequentially from memory: 250,000 ns   (0.25 ms)
Datacenter round trip (same region): 500,000 ns   (0.5 ms)
Read 1 MB sequentially from SSD:   1,000,000 ns   (1 ms)
HDD disk seek:                    10,000,000 ns   (10 ms)
Read 1 MB sequentially from HDD:  20,000,000 ns   (20 ms)
Send packet from US to Europe:   150,000,000 ns  (150 ms)
```

*Rough numbers from Jeff Dean's famous talk at Google. Pin these in your brain.*

Look at the gap between RAM (100ns) and disk (10ms for a seek). That's a **100,000x difference**. If reading from RAM is equivalent to picking up something from your desk, then reading from disk is equivalent to walking around your house for 20 minutes to find it.

This is why a database that fits in memory is fundamentally different from one that has to read from disk. Not marginally better — orders-of-magnitude different.

Now add the reality that a "simple" web request might involve:
1. DNS lookup (another network round-trip)
2. TCP connection establishment (handshake: at least 1 round-trip)
3. TLS negotiation (1-2 more round-trips)
4. The actual HTTP request and response
5. Your backend making a database query (disk I/O + network)
6. Your backend maybe doing 3-5 more database queries
7. Rendering the response

Each step compounds. Five database queries that each take 20ms are 100ms, and that's before you've accounted for network time or rendering.

---

## The Latency Trap: Averages Lie

Here's where engineers get seriously misled.

Suppose you check your server logs and find that the average response time is 50ms. Great! That's fast!

But then a user complains that the site "sometimes hangs for 10 seconds." And your colleagues swear they've seen 5-second page loads. And your monitoring shows 50ms average, so... who's lying?

Nobody. The average is lying.

**Response times are not normally distributed.** They have a long tail. Most requests might complete in 10-20ms, dragging the average down, while a small fraction take 2000ms or 5000ms. The average hides these slow requests completely.

Consider this distribution:
```
90% of requests complete in:   15ms
99% of requests complete in:  100ms
99.9% of requests complete in: 2000ms
```

Average: maybe 35ms. Looks great.

But if you have 10,000 requests per second, the **99th percentile** means 100 requests per second are taking over 100ms. The **99.9th percentile** means 10 requests per second are hanging for 2 full seconds. Those are your screaming users. Your average never surfaces them.

This is why the industry measures **percentiles**, not averages:
- **p50** (median): half of requests are faster than this
- **p95**: 95% of requests are faster than this. 5% are slower.
- **p99**: 99% of requests are faster. 1% see this or worse.
- **p999** (p99.9): The tail. Your worst 0.1% of requests.

When a system specification says "p99 latency under 50ms," it means the slowest 1% of requests must complete within 50ms. That's a meaningful commitment.

> **Why p99 matters so much**: At scale, unlikely events become frequent. 1% of requests might seem negligible. At 10,000 requests per second, that's 100 requests per second experiencing the bad path. Across millions of users per day, thousands of people have a terrible experience every single day.

---

## What Causes Latency? The Three Sources

Latency comes from three sources, and knowing which one you're fighting determines the fix.

**1. Transmission delay**
The time it takes to put bits on the wire. Sending 1MB over a 10Mbps connection takes 800ms just to transmit — that's fundamental to the link speed, not something you can optimize in code.

**2. Propagation delay**
The time it takes signals to travel through the medium. This is physics. Light in fiber, electrons in copper — they have a finite speed. If your server is 5,000km away, you'll always have at least 25ms of propagation delay. The fix is to move the server closer (CDNs, edge computing, regional replication).

**3. Processing delay**
The time your system spends actually working: running queries, executing code, serializing responses. This is where optimization lives. Faster queries, better algorithms, caching, parallel execution.

When a system is slow, your first job is to figure out which of these three is the bottleneck. Optimizing processing delay when your issue is propagation delay is like tuning a race car engine when the problem is that you need to drive 1000km.

---

## Throughput: The Other Kind of "Fast"

Latency is about individual operations. Throughput is about **how much work a system can do per unit of time**.

Throughput is measured in requests per second, transactions per second, bytes per second, whatever unit fits the domain. A database might handle 100,000 queries per second. A web server might handle 50,000 HTTP requests per second.

Here's the key insight: **latency and throughput are related, but they're not the same thing, and improving one can hurt the other.**

Imagine a restaurant with one table. One couple is seated, waits, is served, and leaves in 45 minutes. Very low latency — they never waited in line. Throughput: 2 customers per 45 minutes, or about 2.7 customers per hour.

Now the restaurant adds 10 tables. Throughput goes way up. But on a busy Saturday night, there's a 30-minute wait for a table. Latency has increased, even though throughput improved dramatically.

In software systems, this manifests as **queuing**. When requests arrive faster than they can be processed, they queue up. Each request in the queue waits for all previous requests to finish. This additional wait time is called **queuing latency**, and it's often the dominant component of overall latency in high-load systems.

---

## Little's Law: The Most Useful Equation in Systems Engineering

There's a beautiful equation from queuing theory called Little's Law:

```
L = λ × W
```

Where:
- **L** = average number of items in the system (queue length + items being processed)
- **λ** (lambda) = average arrival rate (requests per second)
- **W** = average time each item spends in the system (latency)

This is powerful because it lets you calculate any one of these from the other two.

**Example 1**: Your database handles 100 queries per second (λ = 100). The average query takes 50ms (W = 0.05s). Therefore L = 100 × 0.05 = **5 queries in flight at any given moment**. That means you need at least 5 database connections in your connection pool, or queries will wait.

**Example 2**: You want maximum latency of 200ms (W = 0.2s) and you're seeing on average 50 requests queued (L = 50). Therefore λ = 50 / 0.2 = **250 requests per second** is your maximum throughput before latency exceeds 200ms.

**Example 3**: Your queue is backing up (L keeps growing). Little's Law tells you why: either requests are arriving faster than you can process them (λ is growing), or your processing is getting slower (W is growing). You need to know which.

Little's Law won't solve your problems, but it gives you a framework to reason about whether your capacity matches your load.

---

## Why "Fast Enough" Depends Entirely on Context

I said 100ms "feels like forever" to a human. But that's not always the relevant measure.

A batch job that processes last night's data can take 4 hours — that's fine, it runs while everyone sleeps.

An analytics dashboard query can take 3 seconds — users expect that.

A page load should be under 2 seconds — people start abandoning at 3 seconds.

An API backing a mobile app should be under 500ms — the UI is blocking on this.

A trading system executing a stock order should be under 1ms — every millisecond of latency is money.

A game sending player position updates should be under 20ms — humans can feel the lag above this.

**The correct latency target is whatever your actual use case requires.** Not what sounds impressive, not what a blog post says is "fast" — what your specific users in your specific context will actually notice.

Before you optimize anything, ask: "What does fast *enough* mean here?" Then measure where you actually are. Then close the gap, if there is one.

---

## The Practical Upshot

Here's what this all means in practice when you're designing or debugging a system:

1. **Measure percentiles, not averages.** Your p99 tells you about the people having bad experiences. Your average hides them.

2. **Identify the bottleneck before optimizing.** Is your latency from network distance? Processing time? Queuing? These have different fixes.

3. **Understand your latency budget.** If you have 200ms to respond, and the database is 40ms away, and you're making 5 queries, you're already at 200ms before your application code runs.

4. **Scale for throughput, optimize for latency.** Adding more machines increases throughput. Making each operation faster reduces latency. You usually need both levers.

5. **Know the fundamental numbers.** L1 cache: 1ns. RAM: 100ns. SSD: 100μs. Disk: 10ms. Datacenter network: 0.5ms. These belong in your intuition, not in a reference you look up.

In the next lesson, we'll go deeper into what's actually happening inside the machine — the CPU, memory hierarchy, and I/O stack that these numbers come from. Once you understand *why* RAM is 100,000x faster than disk, you'll never look at a database architecture the same way.
