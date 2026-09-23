---
id: observability-slos-slis-and-error-budgets
title: "SLIs, SLOs, and Error Budgets: The Google SRE Framework"
track: observability
module: telemetry
level: intermediate
duration: 20
prerequisites: [observability-metrics-logs-traces-three-pillars]
concepts: [sli, slo, sla, error-budgets, site-reliability-engineering, burn-rate]
tags: [observability, sre, slos, reliability, metrics]
order: 2
---

# SLIs, SLOs, and Error Budgets: The Google SRE Framework

Engineers frequently promise: *"Our goal is 100% uptime with zero errors."*

In distributed systems, **100% reliability is the wrong target**:
1. Achieving the last 0.01% of reliability costs more than all preceding engineering investments combined.
2. The user's own cellular connection, home Wi-Fi router, and browser crash more frequently than 99.9% of backend services; the user will never notice the difference between 99.99% and 100%.
3. Demanding 100% reliability freezes product innovation, because every new feature deployment carries some risk of introducing bugs.

Site Reliability Engineering (SRE) balances innovation velocity and reliability through **SLIs**, **SLOs**, and **Error Budgets**.

---

## 1. Defining the Terms

```
                     ┌─────────────────────────────────────────┐
                     │ Service Level Indicator (SLI)           │
                     │ "What is the measured reality right now?│
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │ Service Level Objective (SLO)           │
                     │ "What internal target do we commit to?" │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │ Service Level Agreement (SLA)           │
                     │ "What legal/financial penalty if failed?│
                     └─────────────────────────────────────────┘
```

### SLI (Service Level Indicator)
A carefully defined metric tracking service health from the user's perspective:

$$\text{SLI} = \frac{\text{Good Requests (HTTP status } < 500 \text{ AND Latency } < 200\text{ms})}{\text{Total Valid Requests}} \times 100\%$$

### SLO (Service Level Objective)
The internal target agreed upon by engineering and product management:
- *"99.9% of valid checkout requests over a rolling 30-day window must return HTTP 200 within 200ms."*

### SLA (Service Level Agreement)
The external legal contract with paying enterprise customers:
- *"If availability drops below 99.5% in a billing month, customer receives a 25% credit."*
- **SRE Rule**: **Always set your internal SLO strictly higher than your external SLA** (e.g. SLO = 99.9%, SLA = 99.5%) so engineering can fix issues before incurring financial penalties!

---

## 2. The Power of Error Budgets

The **Error Budget** is simply the mathematical inverse of your SLO:

$$\text{Error Budget} = 100\% - \text{SLO}$$

If your SLO is **99.9% (Three Nines)**:
- Your allowed unreliability over a 30-day period ($43,200\text{ minutes}$) is:

$$43,200 \times (1 - 0.999) = \mathbf{43.2\text{ minutes of total allowable downtime}}$$

### How the Error Budget Governs Engineering Behavior
- **Budget Remaining ($>0$)**: The team has healthy headroom. Developers are encouraged to push new features, ship major database migrations, and experiment aggressively.
- **Budget Exhausted ($\le 0$)**: All feature deployments are **frozen**. The entire engineering team redirects 100% of their sprints toward reliability work: fixing flaky tests, optimizing slow queries, adding circuit breakers, and improving disaster recovery automation until the rolling 30-day budget recovers.
