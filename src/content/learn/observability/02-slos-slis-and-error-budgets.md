---
id: observability-slos-error-budgets
title: "SLOs and Error Budgets: Measuring Reliability as a Product Decision"
track: observability
module: reliability-measurement
level: advanced
duration: 18
prerequisites: [observability-three-pillars]
concepts: [slo, sli, sla, error-budget, reliability-target, burn-rate, toil]
tags: [advanced, observability, slo, sli, error-budget, reliability]
interactive:
  type: error-budget
  enabled: true
order: 2
---

# SLOs and Error Budgets: Measuring Reliability as a Product Decision

How reliable should your system be? "As reliable as possible" isn't an answer — it's an aspiration that leads to infinite cost and zero feature velocity.

Reliability is a product decision, not a technical one. And SLOs (Service Level Objectives) are the framework that makes that decision explicit, measurable, and actionable.

---

## The Three Terms

**SLI (Service Level Indicator)**: A measurement of your system's behavior. Examples: request success rate, latency at the 99th percentile, data freshness. SLIs are the numbers you measure.

**SLO (Service Level Objective)**: A target for an SLI. "99.9% of requests should succeed" or "p99 latency should be under 200ms." SLOs are the goals you set.

**SLA (Service Level Agreement)**: A contractual commitment to meet an SLO, with financial penalties if you don't. SLAs are the promises you make to customers (and you should always set SLOs tighter than SLAs — give yourself headroom).

---

## What "99.9% Available" Actually Means

Availability targets are commonly expressed as "nines":

| Availability | Downtime per year | Downtime per month |
|---|---|---|
| 99% ("two nines") | 3.65 days | 7.3 hours |
| 99.9% ("three nines") | 8.77 hours | 43.8 minutes |
| 99.95% | 4.38 hours | 21.9 minutes |
| 99.99% ("four nines") | 52.6 minutes | 4.38 minutes |
| 99.999% ("five nines") | 5.26 minutes | 26.3 seconds |

Each additional nine is approximately 10x harder and 10x more expensive to achieve. Going from 99.9% to 99.99% doesn't mean "a little more reliable" — it means "10x less downtime allowed," which requires fundamentally different engineering practices (redundancy, failover, multi-region deployment).

**The key question**: What does your product actually need? A developer tool used during business hours probably needs 99.9%. A stock trading platform needs 99.99%+. An internal dashboard might be fine at 99%.

---

## Error Budgets: Spending Unreliability Wisely

If your SLO is 99.9% availability, that means you can afford to be unavailable for 0.1% of the time — about 43 minutes per month.

That 0.1% is your **error budget**. You can "spend" it on:
- Deploying risky features (if the deployment causes a 10-minute outage, that consumes 10 minutes of your 43-minute budget)
- Running experiments
- Performing maintenance
- Handling unexpected incidents

**The power of error budgets**: They resolve the tension between feature velocity and reliability.

Without error budgets: the development team wants to ship features. The ops team wants stability. They argue forever.

With error budgets: "We have 30 minutes of error budget remaining this month. We can afford one risky deployment, or we should wait until next month." The discussion becomes data-driven, not political.

**If you've consumed your error budget**: Stop shipping risky changes. Focus on reliability improvements until the budget replenishes. This is the most important governance mechanism — it automatically throttles feature velocity when reliability suffers.

**If you have excess error budget**: Ship more aggressively! You're being too cautious. The error budget says you have room for more risk.

---

## Choosing the Right SLIs

Not all metrics make good SLIs. Good SLIs measure what users experience, not what the system does internally.

**Good SLIs**:
- Percentage of HTTP requests that return successfully (2xx) within 200ms
- Percentage of database queries that complete within 50ms
- Percentage of messages processed within 5 seconds of being published
- Data freshness: percentage of time the dashboard reflects data less than 60 seconds old

**Bad SLIs**:
- CPU utilization (high CPU might be fine if users are happy)
- Number of servers running (irrelevant to user experience)
- Uptime of a single component (the system might be available even if one component is down)

**The test**: If this SLI degrades, will users notice? If yes, it's a good SLI. If not, it's an internal metric (useful for debugging, not for SLOs).

---

## Burn Rate Alerting

Traditional alerting: "If error rate exceeds 5% for 5 minutes, page someone."

The problem: a 5% error rate for 5 minutes might be a brief spike (not worth paging), while a 1% error rate sustained for 6 hours is quietly consuming your entire error budget (definitely worth investigating).

**Burn rate alerting** asks: "At the current error rate, how fast are we consuming our monthly error budget?"

A burn rate of 1.0 means you're consuming the budget exactly as fast as allowed. A burn rate of 10.0 means you'll exhaust the entire monthly budget in 3 days. A burn rate of 100.0 means you'll exhaust it in 7 hours.

```
Alert conditions:
  - Burn rate > 14x for 1 hour → Page immediately (budget exhausted in ~2 days)
  - Burn rate > 6x for 6 hours → Page (budget exhausted in ~5 days)
  - Burn rate > 1x for 3 days → Ticket (slow burn, needs attention but not urgent)
```

This eliminates alert fatigue (no pages for brief spikes) while catching slow burns that traditional alerting misses.

---

## The Cultural Shift

SLOs and error budgets work only if the organization commits to them:

- **Product managers** participate in setting SLOs (reliability is a product requirement)
- **Engineers** monitor error budgets and adjust velocity accordingly
- **Leadership** respects the error budget freeze (no "just ship it anyway")

The most mature engineering organizations (Google, where SRE originated) treat SLOs and error budgets as the primary governance mechanism for reliability vs. velocity trade-offs. If you're spending more time arguing about reliability priorities than making decisions, SLOs and error budgets are the fix.
