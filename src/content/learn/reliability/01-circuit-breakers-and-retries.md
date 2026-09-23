---
id: reliability-circuit-breakers-and-retries
title: "Circuit Breakers, Exponential Backoff, and Jitter: Stopping Cascading Meltdowns"
track: reliability
module: resilience-patterns
level: advanced
duration: 30
prerequisites: [foundations-latency-throughput]
concepts: [circuit-breaker, exponential-backoff, jitter, retry-storms, cascading-failures, fail-fast]
tags: [reliability, resilience, fault-tolerance, circuit-breaker, sre]
order: 1
---

# Circuit Breakers, Exponential Backoff, and Jitter

In a distributed microservice topology, services do not fail in isolation. When one internal dependency slows down or becomes unavailable, uncoordinated retries and thread starvation can trigger a **cascading meltdown** that brings down an entire corporate infrastructure within seconds.

---

## 1. The Circuit Breaker State Machine

Inspired by electrical circuit breakers that protect home wiring from power surges, the software **Circuit Breaker** wraps downstream network calls to protect caller threads from wasting resources on degraded dependencies.

```
                  ┌────────────────────────────────────────┐
                  ▼                                        │
          ┌───────────────┐   Failure threshold exceeded   │
          │    CLOSED     │ ───────────────────────────────┼────────┐
          │ (Calls Pass)  │                                │        │
          └───────────────┘                                │        │
                  ▲                                        │        ▼
                  │ Success                                │  ┌───────────┐
                  │ threshold met                          │  │   OPEN    │
                  │                                        │  │(Fail-Fast)│
          ┌───────────────┐   Timeout expires (e.g., 30s)  │  └───────────┘
          │   HALF-OPEN   │ ◄──────────────────────────────┘        │
          │ (Probe Calls) │                                         │
          └───────────────┘ ────────────────────────────────────────┘
                              Any probe call fails
```

### The Three Operational States
1. **CLOSED (Normal Operation)**:
   - All outgoing requests pass through to the downstream service.
   - The breaker maintains a rolling window of recent calls.
   - If the error rate (or latency threshold) exceeds a configured threshold (e.g., $>50\%$ failures over the last 100 requests), the circuit trips to **OPEN**.
2. **OPEN (Fail-Fast Protection)**:
   - All incoming requests **fail immediately** without making any network call.
   - The caller returns an immediate fallback response (e.g., cached data or default message) or an HTTP 503 error.
   - Caller threads and connection pools are never held open waiting for timeouts.
   - Gives the downstream service breathing room to recover from high CPU or garbage collection thrashing.
3. **HALF-OPEN (Canary Probing)**:
   - After a configured sleep duration (e.g., 30 seconds), the circuit enters **HALF-OPEN**.
   - It allows a small, throttled number of trial requests through to probe downstream health.
   - If the trial requests succeed, the circuit resets to **CLOSED**.
   - If any trial request fails, the circuit resets back to **OPEN** for another 30 seconds.

---

## 2. Exponential Backoff and Full Jitter

When a network request fails due to a transient blip, blindly retrying immediately creates a **Retry Storm**. If 10,000 clients all retry simultaneously at $T = 1.0\text{s}$, the downstream service is hit by synchronized waves of traffic.

### The Algorithm: Exponential Backoff
Instead of fixed intervals, delay grows exponentially with each attempt:

$$t_{\text{sleep}} = \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}})$$

### Adding "Full Jitter" (Amazon AWS Research)
Even with exponential backoff, clients that started at the same time remain synchronized in lockstep waves. To break synchronization, add randomized **Jitter**:

$$t_{\text{sleep}} = \text{random}(0, \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}}))$$

Randomizing the delay completely flattens the retry curve, spreading retries into a smooth, uniform stream that allows downstream services to recover gracefully.

---

## 3. Best Practices for Retries
- **Never retry non-idempotent operations** (like unkeyed payment charges).
- **Enforce a strict Retry Budget** (e.g., retries must never exceed 10% of total system requests).
- **Propagate Deadline / Context Timeouts**: If a top-level client sets a 500ms timeout, do not allow downstream services to retry a sub-operation at 480ms when the parent request is already abandoned!
