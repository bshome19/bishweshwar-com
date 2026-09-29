---
id: hld-architecture-styles
title: "Monoliths, Microservices, and Everything Between"
track: hld
module: architecture-styles
level: intermediate
duration: 22
prerequisites: [hld-framework]
concepts: [monolith, microservices, event-driven, serverless, service-mesh, modular-monolith, soa]
tags: [intermediate, hld, architecture-styles, monolith, microservices, serverless]
interactive:
  type: architecture-comparison
  enabled: true
order: 2
---

# Monoliths, Microservices, and Everything Between

The architecture style debate — monolith vs microservices — has wasted more engineering time than almost any other topic. Both sides have passionate advocates, both sides have valid points, and most teams choose based on fashion rather than analysis.

The reality is that architecture styles exist on a spectrum. The right position on that spectrum depends on your team size, your system's complexity, your operational maturity, and how well you understand your domain boundaries. Not on what Netflix or Uber uses.

---

## The Monolith: Underrated and Often Correct

A monolith is a single deployment unit. All of your application code — user management, billing, search, notifications — ships as one artifact and runs as one process.

**Strengths that are easy to forget**:

**Simple deployment**: One thing to deploy, one thing to monitor, one thing to roll back.

**Simple debugging**: A bug? It's in this codebase. Set a breakpoint, step through, find it. No tracing requests across 15 services.

**No network overhead between components**: A function call is nanoseconds. A network call is milliseconds. A monolith's internal communication is 1,000,000x faster than a microservice call.

**Refactoring is easy**: Moving code between modules is a rename. Moving code between microservices is a migration project.

**Transactional consistency**: One database, one transaction. No distributed transactions, no eventual consistency, no saga patterns.

**Weaknesses that eventually matter**:

**Scaling is all-or-nothing**: If one component needs 100x the compute, you scale the entire monolith 100x. Wasteful if 95% of the code doesn't need scaling.

**Deployment coupling**: A change to the notification system requires redeploying the entire application. If the notification change breaks billing, billing is down too.

**Team coupling**: As the team grows beyond ~15-20 engineers, coordination becomes a bottleneck. Merge conflicts, testing dependencies, and deploy coordination slow everyone down.

---

## The Modular Monolith: The Best of Both Worlds?

Before jumping to microservices, consider the **modular monolith** — a monolith with strict internal module boundaries.

```
┌─────────────────────────────────────────┐
│ Monolith Application                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Users    │ │ Billing  │ │ Search   │ │
│  │ Module   │ │ Module   │ │ Module   │ │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ │
│        │           │            │        │
│        └───────────┼────────────┘        │
│              Shared Database             │
└─────────────────────────────────────────┘
```

Each module has:
- Its own package/namespace
- Well-defined public interfaces (the "API" between modules)
- Its own database tables (no direct cross-module table access)
- No direct imports of another module's internal code

The modules communicate through defined interfaces, just like microservices — but via in-process function calls, not network requests.

**This gives you most of the organizational benefits of microservices** (clear boundaries, independent development) **without the operational costs** (no service discovery, no distributed tracing, no network latency between components).

When a module's scaling needs diverge from the rest, you can extract it into a separate service. The module boundaries are already defined, making extraction clean.

Shopify runs one of the world's largest modular monoliths. It works.

---

## Microservices: When and Why

Microservices make sense when the costs they introduce are justified by the problems they solve:

**Independent scaling**: Your video transcoding service needs 500 CPU cores. Your user profile service needs 2 cores. With microservices, you scale each independently.

**Independent deployment**: The payments team can deploy their service without coordinating with the search team. Deployment velocity increases with team count.

**Technology diversity**: The ML team writes in Python. The API team writes in Go. The data team uses Scala. Each service can use the right language.

**Fault isolation**: A bug in the recommendation service crashes it. The product catalog, cart, and checkout continue working.

But microservices introduce serious costs:

**Distributed system complexity**: Every concept from the Distributed Systems track (consistency, consensus, partial failure) now applies to your application architecture. You've traded in-process function calls for network calls that can fail, timeout, or deliver duplicate messages.

**Operational overhead**: Each service needs its own deployment pipeline, monitoring, alerting, log aggregation, and on-call rotation. 50 microservices means 50 of everything.

**Data consistency**: A transaction that used to be one database operation (update user + create audit log) now spans two services. You need sagas, eventual consistency, or compensating transactions.

**Debugging difficulty**: A user reports a bug. The request touched 8 services. Which one had the problem? You need distributed tracing (Jaeger, Zipkin) just to figure out where to look.

---

## Event-Driven Architecture: Decoupling Through Events

In a traditional architecture, services call each other directly (synchronous coupling). In an event-driven architecture, services emit events and other services react to them (asynchronous, decoupled).

```
Traditional:          Order Service → calls → Inventory Service
                      Order Service → calls → Email Service
                      Order Service → calls → Analytics Service

Event-Driven:         Order Service → emits "OrderCreated" event
                      Inventory Service ← subscribes to "OrderCreated"
                      Email Service ← subscribes to "OrderCreated"
                      Analytics Service ← subscribes to "OrderCreated"
```

**The advantage**: The Order Service doesn't know (or care) what happens after an order is created. Adding a new subscriber (say, a Fraud Detection Service) doesn't require any change to the Order Service. Loose coupling.

**The disadvantage**: It's harder to trace what happens when an order is created. The flow isn't in one codebase — it's spread across multiple services reacting to events. Debugging requires event tracing. And the temporal coupling is gone but replaced with eventual consistency — the inventory update isn't immediate.

**Event sourcing** takes this further: instead of storing current state, you store the sequence of events that produced the state. The current state is derived by replaying events. This gives you a complete audit trail and the ability to reconstruct state at any point in time.

---

## Serverless: Functions as the Deployment Unit

Serverless (AWS Lambda, Google Cloud Functions, Cloudflare Workers) takes decomposition to the extreme: each function is independently deployed and scaled.

```
API Gateway → Lambda: createUser
            → Lambda: getUser
            → Lambda: processPayment
            → Lambda: sendNotification
```

**Strengths**:
- **Zero idle cost**: You pay only when functions execute. No traffic = $0.
- **Auto-scaling to zero and to infinity**: From 0 to 10,000 concurrent executions automatically.
- **No server management**: No OS patches, no capacity planning, no load balancer configuration.

**Weaknesses**:
- **Cold starts**: The first invocation after a period of inactivity takes 100ms-2s to spin up the runtime. Subsequent invocations are fast.
- **Execution limits**: Functions typically have a maximum execution time (15 minutes on AWS Lambda). Long-running tasks don't fit.
- **Vendor lock-in**: Serverless platforms are deeply tied to their cloud provider's ecosystem.
- **Debugging is harder**: No SSH into the server. No persistent logs on the machine. Everything is through cloud observability tools.

**Best fit for**: Event-triggered processing (file uploaded → process it), APIs with variable traffic (very busy sometimes, idle otherwise), scheduled tasks, and webhook handlers.

**Poor fit for**: Long-running processes, latency-sensitive applications (cold starts), and applications with complex local state.

---

## Service Mesh: Infrastructure for Microservices Communication

When you have dozens or hundreds of microservices, common cross-cutting concerns emerge: service discovery, load balancing, mutual TLS, retries, circuit breaking, observability.

A **service mesh** (Istio, Linkerd, Consul Connect) handles these concerns as infrastructure, so individual services don't have to implement them:

```
Service A → [Sidecar Proxy] ──network──► [Sidecar Proxy] → Service B
```

Each service gets a "sidecar" proxy (typically Envoy) that intercepts all network traffic. The proxy handles: encryption (mutual TLS), retries, circuit breaking, load balancing, and emitting telemetry.

**The benefit**: Application code is clean — no retry logic, no circuit breaker libraries, no TLS certificate management. The mesh handles it.

**The cost**: Additional infrastructure complexity. Two extra network hops per service call (through both sidecars). Debugging mesh issues requires understanding the mesh configuration.

Service meshes are justified when you have many (20+) microservices and consistent cross-cutting behavior is important. For 3-5 services, it's overkill.

---

## Choosing Your Architecture: The Real Decision Framework

| Your Situation | Recommended Architecture |
|---|---|
| Small team (1-10), new product, uncertain requirements | Monolith |
| Growing team (10-30), well-understood domain boundaries | Modular monolith |
| Large org (30+), distinct domains, need independent deployment | Microservices for well-understood boundaries; modular monolith for the rest |
| Variable traffic, event-triggered workloads | Serverless for specific functions, monolith or microservices for the core |
| Real-time, event-heavy, many independent reactors | Event-driven architecture |

**The meta-principle**: Start simple. Add complexity only when you can articulate the specific problem it solves. Every architectural style has costs — make sure the benefits exceed the costs for *your* situation, not for Netflix's.
