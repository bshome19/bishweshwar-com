---
id: reliability-bulkheads-load-shedding
title: "When You Can't Handle Everything: Load Shedding and Graceful Limits"
track: reliability
module: capacity-protection
level: advanced
duration: 20
prerequisites: [reliability-circuit-breakers-retries]
concepts: [load-shedding, bulkhead, backpressure, graceful-degradation, rate-limiting, priority-queues, admission-control]
tags: [advanced, reliability, load-shedding, bulkheads, backpressure, capacity]
interactive:
  type: load-shedding
  enabled: true
order: 2
---

# When You Can't Handle Everything: Load Shedding and Graceful Limits

Here's a thought experiment.

You're running a restaurant. On a typical evening, you seat 100 guests and everyone gets served within 30 minutes. Your kitchen handles the load, your waitstaff covers every table, and people leave happy.

One evening, 500 guests show up. What happens?

If you try to seat all 500: the kitchen drowns, food takes 3 hours, half the dishes are wrong because the cooks are frantic, and every single guest has a terrible experience. You've turned 500 potential happy customers into 500 furious ones.

If, instead, you seat the first 120 (your real capacity), and tell the other 380 "sorry, we're full tonight" — 120 guests have a great experience. The 380 are disappointed but not angry. Your reputation survives. Your staff doesn't quit.

The restaurant knew its limits and shed load accordingly. **Load shedding** is this concept applied to software systems: when incoming demand exceeds your system's capacity, deliberately reject some requests so the requests you do serve get good service.

---

## Why Overloaded Systems Don't Degrade Linearly

There's a crucial intuition that makes load shedding necessary: **a system at 120% of capacity doesn't serve 120% slower — it often serves 1000% slower, or stops serving entirely**.

Why? Because overload triggers cascading internal effects:

**Memory pressure**: More queued requests → more memory consumed → garbage collection kicks in → GC pauses stall all processing → queues grow further → more GC → system spirals.

**Thread exhaustion**: All threads are blocked waiting for slow downstream calls → no threads available to process new requests → incoming requests queue indefinitely → timeouts fire → clients retry → more requests arrive → death spiral.

**Connection pool saturation**: Database connection pool is full → new queries wait for a connection → while waiting, they hold the HTTP thread → HTTP thread pool fills up → system becomes unresponsive.

**Lock contention**: More concurrent threads competing for shared resources → more time spent waiting for locks → throughput drops dramatically → the more you add, the slower it gets (Amdahl's Law in action).

The result: a system that handles 1000 QPS beautifully might completely collapse at 1200 QPS. Not 20% slower — dead. This non-linear degradation is why "just scale up a little" doesn't always work. You need to actively protect your system's capacity.

---

## Load Shedding: Rejecting Work to Stay Alive

Load shedding is the practice of **deliberately rejecting requests when the system is approaching capacity**, so that accepted requests can be served at full quality.

The simplest implementation: track the number of in-flight requests. When it exceeds a threshold, return a fast error (HTTP 503 Service Unavailable) for new requests without doing any processing.

```python
class LoadShedder:
    def __init__(self, max_in_flight=500):
        self.max_in_flight = max_in_flight
        self.current_in_flight = 0
    
    def handle_request(self, request):
        if self.current_in_flight >= self.max_in_flight:
            return Response(503, "Server is at capacity. Please retry later.")
        
        self.current_in_flight += 1
        try:
            return process(request)
        finally:
            self.current_in_flight -= 1
```

A 503 response takes microseconds to send. A fully-processed request takes 50ms. By quickly rejecting excess requests, you free up all your resources for the requests you can actually serve well.

**The counterintuitive lesson**: a system that responds to overload by rejecting 40% of requests and serving the remaining 60% well is dramatically better than one that accepts all requests and serves all of them poorly. Users who receive a fast "please retry" can retry and succeed. Users who receive a 30-second timeout get nothing.

---

## Priority-Based Load Shedding

Not all requests are equally important.

A health check from your load balancer? Critical — if you don't respond, the load balancer removes you from rotation.

A user loading their dashboard? Important — this is a live user.

A background analytics event? Low priority — can be delayed or dropped without users noticing.

Priority-based load shedding means: when you need to shed load, shed the least important requests first.

```python
def handle_request(self, request):
    priority = classify_priority(request)
    
    if self.current_in_flight >= self.max_in_flight:
        if priority == "critical":
            pass  # Always serve health checks
        elif priority == "high":
            if self.current_in_flight >= self.max_in_flight * 1.1:
                return Response(503, "At capacity")
        else:
            return Response(503, "At capacity")  # Low priority shed first
    
    # Process normally
```

Google's Envoy proxy and many service mesh implementations support request priority classification, allowing you to configure which requests should be shed first.

---

## Adaptive Load Shedding: Responding to Real Conditions

A fixed threshold ("reject above 500 concurrent requests") is simple but imprecise. Your system's capacity varies: it depends on the types of requests, the health of downstream services, available memory, CPU temperature, and a dozen other factors.

**Adaptive load shedding** adjusts the threshold based on real-time system health:

```python
def should_shed(self):
    cpu_usage = get_cpu_usage()
    latency_p99 = get_recent_p99_latency()
    error_rate = get_recent_error_rate()
    
    # If any health indicator is critical, start shedding
    if cpu_usage > 0.85:  # CPU above 85%
        return True
    if latency_p99 > self.target_latency * 3:  # Latency 3x above target
        return True
    if error_rate > 0.10:  # Error rate above 10%
        return True
    
    return False
```

**CoDel (Controlled Delay)** is an adaptive algorithm from networking that can be applied to request queues. Instead of measuring queue length (which doesn't account for processing speed), CoDel measures **how long requests are waiting in the queue**. If requests are consistently waiting longer than a target threshold (say, 5ms), it starts dropping the newest arrivals. If queue wait times improve, it stops dropping.

The key insight of CoDel: it measures the *sojourn time* (time spent in queue), not the queue length. A long queue that's draining quickly is fine. A short queue where items wait a long time is not.

---

## Backpressure: Asking Upstream to Slow Down

Load shedding is reactive — you reject work that's already arrived. **Backpressure** is proactive — you signal upstream to stop sending so much work.

In a streaming pipeline:
```
Producer → Message Queue → Consumer
```

If the Consumer can't keep up, the queue grows. Eventually the queue hits its limit. At that point:

**Without backpressure**: The Producer keeps sending. Messages are dropped. Data is lost.

**With backpressure**: The queue tells the Producer "I'm full, slow down." The Producer reduces its sending rate. The Consumer catches up. No data is lost.

TCP's flow control is backpressure: the receiver advertises its available buffer space, and the sender reduces its sending rate accordingly.

Reactive Streams (in Java, Kotlin, Project Reactor) formalize backpressure: a subscriber tells the publisher how many items it's ready to process, and the publisher doesn't send more.

**The general principle**: In any pipeline of processing stages, the slowest stage determines the throughput of the whole pipeline. Backpressure propagates this information upstream so that every stage operates at the rate the slowest stage can handle — instead of letting work pile up between stages.

---

## Rate Limiting vs Load Shedding

These are related but different tools:

**Rate limiting**: Limits how much work a specific client or user can submit. "You can make 100 requests per minute." If you exceed that, you're throttled. This protects the system from abusive or misconfigured clients, and ensures fair access.

**Load shedding**: Limits the total work the system accepts, regardless of the source. "This server can handle 5000 concurrent requests." If total load exceeds that, some requests are rejected. This protects the system from aggregate overload.

Rate limiting is about fairness and preventing abuse. Load shedding is about system survival.

In practice, you implement both:
- Rate limiting at the edge (API gateway): per-client limits
- Load shedding at the service level: per-instance capacity protection

---

## What Good Load Shedding Looks Like to Users

Done well, load shedding is nearly invisible to users:

1. A user's request is rejected with a fast HTTP 503
2. The client or browser immediately retries (possibly after a short backoff)
3. The retry succeeds (because the shed created capacity for it)
4. The user sees a slightly delayed response, maybe 200ms extra, but never a timeout or error page

Done poorly, load shedding is a disaster:
- Errors without retry guidance (clients don't know they should retry)
- Shedding all request types equally (health checks get shed, load balancers mark the instance as dead)
- No metrics on shed rate (you don't know it's happening until users complain)

**Include the `Retry-After` header** in 503 responses. It tells clients exactly how long to wait before retrying. Well-behaved clients will obey this, naturally spacing out their retries.

---

## The Real-World Defense Stack

In production systems at scale, all of these mechanisms work together:

```
Internet Traffic
     │
     ▼
[CDN/Edge] ──── Static content served here (most traffic never reaches you)
     │
     ▼
[API Gateway / Load Balancer] ──── Rate limiting per client
     │                              Health check routing
     ▼
[Service Instance] ──── Load shedding (reject if at capacity)
     │                   Circuit breakers (per downstream dependency)
     │                   Bulkheads (isolated resource pools)
     ▼
[Dependencies] ──── Timeouts on every call
                     Retries with exponential backoff
                     Graceful degradation on failure
```

Each layer protects the one below it. The CDN absorbs static content requests so they never hit your servers. The API gateway limits per-client abuse. Load shedding protects individual instances. Circuit breakers protect against failing dependencies. Timeouts prevent hanging. Retries handle transients. Graceful degradation ensures users see something rather than nothing.

No single mechanism is sufficient. Together, they create a system that degrades gradually under stress rather than collapsing suddenly.
