---
id: observability-metrics-logs-traces-three-pillars
title: "The Three Pillars of Observability: Metrics, Logs, and Distributed Traces"
track: observability
module: telemetry
level: intermediate
duration: 30
prerequisites: [foundations-latency-throughput]
concepts: [observability, metrics, logs, distributed-tracing, opentelemetry, context-propagation, trace-id]
tags: [observability, telemetry, tracing, opentelemetry, prometheus, sre]
order: 1
---

# The Three Pillars of Observability: Metrics, Logs, and Distributed Tracing

In a monolithic architecture, debugging was simple: you SSH'd into the server and ran `grep` on `/var/log/app.log`.

In a distributed microservice topology where a single user click fans out across 40 independent containerized services executing asynchronously across multiple Kubernetes clusters, local log files are useless. You need **Observability**.

---

## 1. The Three Telemetry Pillars Compared

```
                ┌──────────────────────────────────────────────┐
                │          OBSERVABILITY ECOSYSTEM             │
                └──────────────────────┬───────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
   1. METRICS                      2. LOGS                    3. DISTRIBUTED TRACES
   (Aggregated Numbers)      (Discrete Events)          (End-to-End Request Path)
   • Prometheus / StatsD     • JSON Structured Logs     • OpenTelemetry / Jaeger
   • Tells you: "SOMETHING   • Tells you: "WHY DID IT   • Tells you: "WHERE DID IT
     IS WRONG!"                HAPPEN?"                   HAPPEN & WHO WAS WAITING?"
```

### Pillar 1: Metrics (Aggregated Numeric Time-Series)
- **Concept**: Numerical measurements aggregated over time intervals (Counters, Gauges, Histograms).
- **Cost**: Extremely cheap to store and query because individual request identities are discarded. Storing 100,000 metrics per second consumes minimal disk space.
- **Strengths**: Perfect for real-time alerting, dashboards, and automated scaling policies (e.g., alert when p99 latency $> 200\text{ms}$ or error rate $> 1\%$).

### Pillar 2: Structured Logs (Event Records)
- **Concept**: Timestamped, context-rich JSON records emitted by code execution paths:
  `{"timestamp": "2026-03-24T12:00:00Z", "level": "ERROR", "trace_id": "a1b2", "user_id": 99, "error": "InsufficientFunds"}`
- **Strengths**: Contains exact variables, parameters, and stack traces needed to understand root cause.
- **Cost**: Expensive at scale. Logging 50,000 requests/sec in full JSON requires gigabytes of ingestion and indexing storage daily (e.g., Elasticsearch, Loki, Datadog).

### Pillar 3: Distributed Tracing (Request Context Graphs)
- **Concept**: Captures the journey of a request as it traverses distributed network boundaries.
- **Components**:
  - **Trace**: The end-to-end transaction.
  - **Span**: A single discrete unit of contiguous work (e.g., executing an HTTP call or SQL query).
  - **Trace ID & Span ID**: Unique identifiers propagated across network headers (W3C `traceparent`).

---

## 2. Distributed Context Propagation (W3C Trace Context)

How does Service D know that its database query was triggered by a user click that entered through the API Gateway at Service A?

```
User Click ──► API Gateway (Generates Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736)
                     │
                     ▼ (Injects HTTP Header: traceparent: 00-4bf92f...-0001-01)
               Auth Service
                     │
                     ▼ (Propagates traceparent to gRPC metadata)
               Payment Service
                     │
                     ▼ (Attaches Span to DB SQL query)
               PostgreSQL Database
```

When an alert fires indicating that checkout latency jumped to 4 seconds, you load the Trace ID into **Jaeger** or **Datadog**. The waterfall visualization instantly reveals the exact bottleneck:
- Service A took 5ms.
- Service B took 10ms.
- Service C spent **3,980ms** blocked waiting for an unindexed table scan in PostgreSQL!
- Root cause identified in 30 seconds rather than 4 hours of reading unrelated log files.
