---
id: expert-staff-architecture-reviews-and-adrs
title: "Staff+ Architecture Reviews and Architectural Decision Records (ADRs)"
track: expert
module: technical-leadership
level: expert
duration: 35
prerequisites: [hld-end-to-end-hld-framework]
concepts: [adr, architecture-reviews, technical-leadership, trade-off-analysis, staff-plus, governance]
tags: [expert, leadership, adr, architecture, staff-engineer]
order: 1
---

# Staff+ Architecture Reviews and Architectural Decision Records (ADRs)

Junior and mid-level engineers are evaluated on how quickly and cleanly they implement features. Staff, Principal, and Distinguished Architects are evaluated on **the long-term organizational and technical consequences of their decisions**.

At the Staff+ level, software architecture is less about drawing boxes and more about **governance, consensus-building, technical risk reduction, and preserving institutional memory**.

---

## 1. Why Great Architectures Fail: The Tribal Knowledge Trap

Have you ever joined a new engineering team, looked at a piece of backend code or database schema, and thought:
*"Why on earth did the previous team build this bizarre, over-complicated custom queue instead of just using standard Kafka?"*

Two years later, you discover:
- Two years ago, the team was on an isolated on-premise datacenter with zero internet access and strict compliance rules banning Java runtimes.
- The decision was 100% rational given the constraints of the time. But because **no record was kept of the context and trade-offs**, future engineers spent months refactoring it—only to hit the exact same physical constraints!

---

## 2. Architectural Decision Records (ADRs)

An **Architectural Decision Record (ADR)** is a lightweight, version-controlled markdown document that captures an important architectural decision, the context in which it was made, the alternatives considered, and the resulting trade-offs.

### The Canonical Michael Nygard ADR Template

```markdown
# ADR-0024: Adopt Asynchronous Change Data Capture (CDC) via Debezium

## Status
Accepted (2026-03-24)

## Context
Our Order Service currently uses dual-writes in application code to update 
both PostgreSQL and Elasticsearch. Under high peak traffic, network timeouts 
between the App and Elasticsearch cause search indexes to silently drift out 
of sync with the primary database, resulting in customer support escalations.
Distributed transactions (2PC) are ruled out due to unacceptable latency impacts.

## Decision
We will eliminate application dual-writes and adopt Change Data Capture (CDC) 
using Debezium tailing the PostgreSQL Write-Ahead Log (WAL), streaming change 
events through an Apache Kafka topic to downstream index consumers.

## Alternatives Considered
1. Two-Phase Commit (2PC): Rejected due to 5x latency overhead and single point of failure.
2. Periodic Full-Table Batch Sync: Rejected because search updates would lag by 15+ minutes.
3. Transactional Outbox Pattern: Viable, but requires manual schema migrations and custom tailing workers.

## Consequences & Trade-Offs
Positive:
- 100% elimination of dual-write race conditions.
- Primary database performance decoupled from search indexing latency.
- Full event replayability from Kafka offsets during downstream outages.

Negative / Costs:
- Operational overhead of maintaining a Debezium Kafka Connect cluster.
- End-to-end consistency is now eventual (typical lag: 50–200ms).
```

### Best Practices for ADRs
- **Store in Git with Code**: Keep ADRs in the repository under `docs/adr/0001-record-architecture-decisions.md`.
- **Immutable History**: If a decision changes, do **not** edit the original ADR. Create a new ADR that explicitly marks the older ADR as `Superseded by ADR-0052`.
- **Review in Pull Requests**: Treat ADRs like code. Circulate PRs for team discussion and peer review before merging.

---

## 3. How to Conduct a High-Impact Architecture Review

1. **Focus on Non-Functional Requirements (NFRs)**: Don't spend review time debating variable naming. Focus on failure modes, blast radiuses, data migration rollback plans, and cloud cost scaling.
2. **Steel-Man the Counterarguments**: Explicitly articulate why an alternative architecture might be superior, and demonstrate quantitatively why the proposed approach remains the better trade-off.
3. **Disagree and Commit**: High-performing engineering organizations do not wait for 100% universal consensus. Once trade-offs are documented in an ADR, the team aligns and executes.
