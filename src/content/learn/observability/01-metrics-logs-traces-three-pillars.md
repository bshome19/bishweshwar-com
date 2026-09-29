---
id: observability-three-pillars
title: "Making Systems Legible: Metrics, Logs, and Traces"
track: observability
module: observability-foundations
level: advanced
duration: 22
prerequisites: [reliability-circuit-breakers-retries]
concepts: [metrics, logs, traces, structured-logging, distributed-tracing, correlation-id, red-method, use-method]
tags: [advanced, observability, metrics, logs, traces, monitoring]
interactive:
  type: observability-dashboard
  enabled: true
order: 1
---

# Making Systems Legible: Metrics, Logs, and Traces

A system you can't observe is a system you can't trust. When it misbehaves — and it will — you need to answer three questions quickly:

1. **Is something wrong?** (Metrics and alerting)
2. **What is wrong?** (Logs)
3. **Where in the system is it happening?** (Traces)

These are the "three pillars of observability." Each answers a different question, and you need all three to diagnose problems in a distributed system.

---

## Pillar 1: Metrics — The Vital Signs

Metrics are **numerical measurements aggregated over time**. They answer: "How is the system doing right now, compared to an hour ago, compared to yesterday?"

```
http_requests_total{method="GET", status="200", path="/api/users"}: 142,857
http_request_duration_seconds{quantile="0.99"}: 0.250
active_database_connections: 42
cache_hit_ratio: 0.94
```

**The RED Method** (for request-driven services):
- **R**ate: How many requests per second?
- **E**rrors: What percentage of requests are failing?
- **D**uration: How long are requests taking? (p50, p95, p99)

**The USE Method** (for resources like CPU, memory, disk):
- **U**tilization: What percentage of the resource is being used?
- **S**aturation: How much work is queued, waiting for the resource?
- **E**rrors: How many error events has the resource produced?

Together, RED and USE cover most monitoring needs. RED tells you about user-facing behavior. USE tells you about system resources.

**Key principle**: Metrics should be aggregated (not individual events) and time-series (tracked over time). They're cheap to store (a few numbers per time series per interval) and fast to query (dashboard loads in seconds even with months of data).

---

## Pillar 2: Logs — The Detailed Record

Metrics tell you something is wrong. Logs tell you *what* is wrong.

A log entry records a specific event: "User 42 submitted order 789 at 14:32:05 and got error code INSUFFICIENT_INVENTORY for product SKU-123."

**Structured logging** is essential at scale. Unstructured logs (`print("Error: something went wrong")`) are impossible to search and analyze. Structured logs are key-value pairs that can be indexed and queried:

```json
{
  "timestamp": "2024-01-15T14:32:05.123Z",
  "level": "ERROR",
  "service": "order-service",
  "trace_id": "abc-123-def-456",
  "user_id": 42,
  "order_id": 789,
  "error": "INSUFFICIENT_INVENTORY",
  "product_sku": "SKU-123",
  "message": "Failed to place order: insufficient inventory"
}
```

Now you can query: "Show me all errors in order-service in the last hour where error = INSUFFICIENT_INVENTORY" — impossible with unstructured text logs.

**Log levels** provide signal-to-noise control:
- **ERROR**: Something failed that shouldn't have. Needs investigation.
- **WARN**: Something unexpected happened but was handled. Monitor for patterns.
- **INFO**: Normal business events. User logged in. Order placed.
- **DEBUG**: Detailed diagnostic information. Disabled in production by default.

---

## Pillar 3: Distributed Traces — Following a Request Through the System

In a microservices architecture, a single user request might touch 8 services. If the request is slow, which service is the bottleneck?

A **distributed trace** follows a single request through all the services it touches, recording the time spent in each one.

```
[Trace: abc-123-def-456]
├── api-gateway (2ms)
│   └── user-service.getUser (15ms)
│       └── postgres.query (8ms)
│   └── product-service.getProducts (45ms)  ← SLOW
│       └── elasticsearch.search (40ms)     ← HERE'S THE PROBLEM
│   └── recommendation-service.recommend (5ms)
Total: 67ms
```

One glance tells you: the product search (Elasticsearch query) is taking 40ms, which is 60% of the total request time. That's where to optimize.

**Correlation IDs**: Every request gets a unique ID (the `trace_id`) at the entry point. This ID is propagated to every downstream service call. All logs from all services for this request share the same trace_id, making it trivial to correlate: "show me all logs for trace abc-123-def-456."

**Spans**: Each unit of work in a trace is a **span** — a named, timed operation. Spans can be nested (the api-gateway span contains child spans for each downstream call). Tools like Jaeger, Zipkin, and OpenTelemetry visualize these as waterfall diagrams.

---

## Putting It Together: The Debugging Workflow

1. **Alert fires**: "Error rate on order-service exceeded 5% for 5 minutes" (metrics)
2. **Check dashboard**: Error rate spiked at 14:30. P99 latency increased. (metrics)
3. **Query logs**: "Show errors in order-service from 14:25 to 14:35" → Multiple INSUFFICIENT_INVENTORY errors, all for the same product SKU (logs)
4. **Check traces**: Find a sample trace for a failed request → The inventory-service call is timing out after 5 seconds (traces)
5. **Root cause**: The inventory-service database is running a long migration that's locking the inventory table. Cancel the migration, error rate drops.

Without metrics, you wouldn't know there's a problem. Without logs, you wouldn't know what's failing. Without traces, you wouldn't know where in the system the failure is.

---

## Practical Observability Advice

**Instrument from day one.** Adding observability after an incident is like installing smoke detectors after a fire. Use OpenTelemetry — it's the vendor-neutral standard for metrics, logs, and traces.

**Alert on symptoms, not causes.** Alert on "error rate > 5%" (symptom), not "CPU > 80%" (cause). Users don't care about CPU — they care about errors. CPU might be high for valid reasons.

**Every log should have a trace_id.** This is the single most impactful observability practice. It lets you correlate logs across services for any request.

**Dashboard the RED metrics for every service.** Rate, errors, duration. If you can see these for every service, you can diagnose most problems in minutes.

In the next lesson, we'll go deeper into SLOs, SLIs, and error budgets — the framework for talking about reliability in a way that drives good engineering decisions.
