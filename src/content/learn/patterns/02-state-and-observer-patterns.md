---
id: patterns-distributed
title: "Distributed Patterns: When Your System Spans Multiple Machines"
track: patterns
module: distributed-patterns
level: intermediate
duration: 22
prerequisites: [patterns-strategy, distributed-systems-cap-pacelc]
concepts: [saga, cqrs, circuit-breaker-pattern, outbox-pattern, event-sourcing, sidecar, ambassador]
tags: [intermediate, patterns, distributed, saga, cqrs, event-sourcing]
interactive:
  type: saga-visualizer
  enabled: true
order: 2
---

# Distributed Patterns: When Your System Spans Multiple Machines

The classic Gang of Four patterns (Strategy, Observer, Factory, etc.) were designed for single-process systems. When your system spans multiple processes, networks, and databases, an entirely new category of problems emerges — and with them, a new set of patterns.

These distributed patterns exist because of one fundamental reality: **you can't have atomic transactions across network boundaries without significant cost**. Everything in this lesson is a consequence of that fact.

---

## The Saga Pattern: Distributed Transactions Without Locks

**The problem**: An operation spans multiple services, each with its own database. You need the operation to either succeed everywhere or fail everywhere — but you can't use a traditional database transaction because there's no single database.

**Example**: Booking a trip requires: (1) reserving a flight, (2) booking a hotel, (3) charging the credit card. If the credit card charge fails, you need to undo the flight reservation and hotel booking.

**The Saga pattern**: Instead of one atomic transaction, execute a sequence of local transactions. Each local transaction updates one service's database and publishes an event to trigger the next step. If any step fails, execute **compensating transactions** to undo previous steps.

```
Step 1: Reserve Flight → success → publish "FlightReserved"
Step 2: Book Hotel → success → publish "HotelBooked"
Step 3: Charge Card → FAILS → publish "PaymentFailed"

Compensation:
Step 2 compensation: Cancel Hotel Booking → publish "HotelCancelled"
Step 1 compensation: Cancel Flight Reservation → publish "FlightCancelled"
```

**Two flavors**:

**Choreography**: Each service listens for events and decides what to do. The saga emerges from the decentralized event flow. Simple for 2-3 steps, but hard to understand and debug for complex flows.

**Orchestration**: A central "saga orchestrator" directs each step, handles failures, and triggers compensations. Easier to understand and manage, but the orchestrator is a single point of coordination.

**The hard truth about sagas**: Compensating transactions aren't always possible. You can un-reserve a flight, but you can't un-send an email. You can't un-charge a credit card (you can *refund*, which is a different operation). Design your saga steps so that the irreversible actions happen last — after everything reversible has succeeded.

---

## CQRS: Separating Reads from Writes

**The problem**: Your read and write workloads have fundamentally different requirements. Writes need strong consistency and complex validation. Reads need to be fast and serve many different view shapes.

Trying to serve both from the same data model creates tension: the write model is normalized (for consistency), but reads need denormalized data (for performance). Adding indexes for every read pattern slows writes.

**CQRS (Command Query Responsibility Segregation)**: Separate the write path and the read path into different models, potentially different databases.

```
Write path:                          Read path:
  Command → Validate → Write DB      Query → Read DB → Response
                ↓                              ↑
           Event published ──────────► Update read model
```

The **write model** is optimized for consistency and validation (a normalized relational database). The **read model** is optimized for queries (a denormalized view, a search index, a materialized view). Events from the write model asynchronously update the read model.

**When CQRS makes sense**:
- Read and write loads differ by 100x or more
- Read views are complex aggregations of multiple entities
- You need different storage technologies for reads vs writes (e.g., write to PostgreSQL, read from Elasticsearch)

**When CQRS is overkill**:
- Simple CRUD applications where reads and writes are similar
- Teams that don't need the operational complexity of maintaining two data stores

**The trade-off**: The read model is **eventually consistent** with the write model. There's a delay between writing data and seeing it in the read model. For most applications this is sub-second, but it exists. Design your UI to handle it.

---

## Event Sourcing: Storing Events Instead of State

**The problem**: You want a complete audit trail. Or you want to be able to reconstruct the state at any point in time. Or you want to derive multiple different views from the same data.

**Event sourcing**: Instead of storing the current state of an entity, store the sequence of events that produced that state.

```
Traditional (store current state):
  Account: { id: 1, balance: 150 }

Event sourcing (store events):
  AccountCreated:    { id: 1, initial_balance: 0 }
  MoneyDeposited:    { id: 1, amount: 200 }
  MoneyWithdrawn:    { id: 1, amount: 50 }
  
  Current state = replay events: 0 + 200 - 50 = 150
```

**Benefits**:
- **Complete audit trail**: Every change is recorded
- **Temporal queries**: "What was the balance at 3pm yesterday?" Replay events up to that timestamp
- **Multiple projections**: Derive different read models from the same events (balance view, transaction history view, monthly summary view)
- **Debugging**: When something goes wrong, replay events to understand exactly what happened

**Costs**:
- **Complexity**: Simple queries become event replays. "What's the current balance?" requires reading and processing all events (unless you maintain a snapshot/projection)
- **Storage**: Events accumulate forever. You need snapshotting to avoid replaying millions of events on every query
- **Schema evolution**: Changing the event format requires handling both old and new format events

**Event sourcing pairs naturally with CQRS**: Events are the write model. Projections (derived from replaying events) are the read model.

---

## The Sidecar Pattern: Adding Capabilities Without Changing Code

**The problem**: You need to add functionality (logging, monitoring, configuration, networking) to a service, but you don't want to modify the service's code.

**The Sidecar pattern**: Deploy a helper process alongside your main service. The sidecar handles cross-cutting concerns; the main service focuses on business logic.

```
┌──────────────────────────┐
│ Pod / Container Group     │
│  ┌──────────┐ ┌────────┐ │
│  │ Main     │ │Sidecar │ │
│  │ Service  │◄►│ Proxy  │ │
│  └──────────┘ └────────┘ │
└──────────────────────────┘
```

**Real-world examples**:
- **Envoy proxy** (in Istio service mesh): Intercepts all network traffic, handles mTLS, retries, circuit breaking, and emits observability data — all without the main service knowing
- **Log collector sidecar**: Reads log files written by the main service and ships them to a centralized logging system
- **Config sidecar**: Watches a configuration server and updates local config files when changes occur

The sidecar pattern is foundational to service mesh architectures. Every service in a mesh gets an Envoy sidecar that handles the networking concerns.

---

## The Strangler Fig Pattern: Replacing Systems Gradually

**The problem**: You need to replace a legacy system with a new one, but you can't do a big-bang migration (too risky) and can't run both systems indefinitely.

**The Strangler Fig pattern** (named after a tree that gradually envelops and replaces its host): Incrementally redirect traffic from the old system to the new one, feature by feature.

```
Phase 1:  All traffic → Old System

Phase 2:  /users traffic → New System
          All other traffic → Old System

Phase 3:  /users traffic → New System
          /orders traffic → New System
          All other traffic → Old System

Phase N:  All traffic → New System
          Old System → decommissioned
```

A routing layer (API gateway, load balancer, or DNS-based routing) directs requests to the old or new system based on the URL path or feature flag.

**The key discipline**: Each migrated feature must be fully verified before moving to the next. If the new system breaks, traffic for that feature can be instantly routed back to the old system.

This is how most large-scale system migrations actually work. The "rewrite from scratch" approach almost always takes longer than planned and risks introducing new bugs. The strangler fig approach delivers incremental value and has an escape hatch at every step.

---

## Choosing Distributed Patterns

| Problem | Pattern | Trade-off |
|---|---|---|
| Multi-service transaction | Saga | Eventual consistency, compensating transactions needed |
| Read/write workload mismatch | CQRS | Operational complexity of two data stores |
| Need complete audit trail | Event Sourcing | Storage growth, replay complexity |
| Add capabilities without code change | Sidecar | Additional resource consumption per instance |
| Replace legacy system | Strangler Fig | Longer migration timeline, routing complexity |

These patterns aren't mutually exclusive — many systems combine several. A system might use Event Sourcing for the write side, CQRS to project read models, and Sagas to coordinate multi-service workflows.

The key: **understand the problem before reaching for the pattern**. Each pattern adds complexity that's only justified when the problem it solves is real and present — not hypothetical.
