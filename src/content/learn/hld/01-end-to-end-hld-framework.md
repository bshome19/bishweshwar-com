---
id: hld-framework
title: "How to Read and Reason About System Architectures"
track: hld
module: architectural-thinking
level: intermediate
duration: 25
prerequisites: [databases-sharding-consistent-hashing, distributed-systems-cap-pacelc]
concepts: [decomposition, requirements-analysis, trade-offs, api-design, data-modeling, architecture-styles]
tags: [intermediate, hld, architecture, decomposition, trade-offs, design-thinking]
interactive:
  type: architecture-tradeoff
  enabled: true
order: 1
---

# How to Read and Reason About System Architectures

The most valuable architectural skill isn't drawing diagrams. It's being able to look at a system you've never seen before and quickly understand: *why is it built this way? What problems drove these choices? What would break if I changed this part?*

This is architectural reasoning — the ability to read systems, not just build them. And like reading literature, it requires understanding the vocabulary, the common patterns, and the forces that shape the work.

---

## Start With Requirements, Not Technology

The most common mistake in system design: jumping to technology choices before understanding what the system needs to do.

"We should use Kafka" — Why? What problem does Kafka solve that you have?

"We need microservices" — Why? What's wrong with a monolith for your current team size and traffic?

"Let's use MongoDB" — Why? What about your data model makes a document store better than a relational database?

Every technology choice should be the *answer* to a *question*. If you can't articulate the question, you don't know if the answer is right.

### Functional Requirements

What the system does from the user's perspective:
- Users can create short URLs from long URLs
- Users can click a short URL and be redirected to the original
- Users can see analytics on their short URLs

### Non-Functional Requirements

How well the system does it — the constraints and quality attributes:
- **Latency**: Redirects must complete in under 100ms
- **Throughput**: Handle 100,000 redirects per second at peak
- **Availability**: 99.99% uptime (under 52 minutes downtime per year)
- **Durability**: Once a short URL is created, it must work forever
- **Consistency**: A newly created URL must be immediately usable
- **Scale**: Support 1 billion stored URLs

Non-functional requirements drive architecture far more than functional requirements. Almost any technology can implement "user creates a short URL." But implementing it at 100,000 QPS with 99.99% availability and global sub-100ms latency — that's what forces specific architectural choices.

---

## Decomposing a System: Where to Draw the Lines

Once you understand requirements, you need to divide the system into components. This is **decomposition** — deciding what the distinct parts of the system are and how they interact.

**The key question**: What should be one component, and what should be separate components?

**Things that change together should be together.** If modifying the user profile always requires modifying the notification system, they're tightly coupled and might be better as one component.

**Things that scale independently should be separate.** URL creation (1,000 QPS) and URL redirect (100,000 QPS) have radically different load profiles. They benefit from being separate services that can scale independently.

**Things with different failure domains should be separate.** If the analytics dashboard goes down, URL redirects should continue working. Separating them ensures the analytics failure doesn't cascade to the redirect path.

### Monolith vs Microservices: The Real Trade-Off

**Monolith**: Everything in one application. Simple deployment, easy debugging, no network calls between components. Ideal for small teams (1-20 engineers), early-stage products, and systems where the component boundaries aren't clear yet.

**Microservices**: Each component is a separate, independently deployable service. Services communicate over the network. Enables independent scaling, independent deployment, and technology diversity. But adds: network latency between services, distributed transaction complexity, operational overhead (monitoring, deployment pipelines, service discovery for each service).

The honest truth: **most applications should start as a monolith**. Not because monoliths are better — but because you don't know enough about your system yet to draw the right service boundaries. Wrong boundaries in a microservices architecture are much harder to fix than wrong module boundaries in a monolith.

Martin Fowler's advice: "Don't even consider microservices unless you have a system that's too complex to manage as a monolith." And even then, extract services at the boundaries that you're most confident about.

---

## Data Modeling: The Decisions That Last

Technology choices can be changed. Data models are much harder to change — they're the foundation everything else builds on.

**Key questions for data modeling**:

**What are the entities?** Users, posts, comments, orders, products. What are the core things the system manages?

**What are the relationships?** A user has many posts. A post has many comments. An order contains many products. Are these one-to-many, many-to-many?

**What are the access patterns?** This is the most important question. How will data be read? "Show me all posts by user X" (query by user). "Show me the 50 most recent posts across all users" (query by time). "Find all users who bought product Y" (query by product).

**Your access patterns determine your data model**, not the other way around. If your primary access pattern is "get all posts by user X," you might organize data by user (denormalized, or sharded by user). If your primary pattern is "get the 50 most recent posts globally," you need a different index or a feed materialization strategy.

### SQL vs NoSQL: Not a Philosophy, a Trade-Off

**Relational databases (PostgreSQL, MySQL)**: Best when your data has clear relationships, you need complex queries (joins, aggregations), and you need ACID transactions. The relational model is extremely flexible — it handles unknown future access patterns well because you can always add indexes.

**Document databases (MongoDB, DynamoDB)**: Best when your data is naturally hierarchical (a user profile with nested preferences, addresses, payment methods), your access pattern is primarily "get document by key," and you don't need complex cross-document queries.

**Wide-column stores (Cassandra, ScyllaDB)**: Best for massive write throughput, time-series data, and access patterns that are known and narrow.

**The honest advice**: Start with PostgreSQL unless you have a specific reason not to. It handles 90% of use cases well, has excellent tooling, and its flexibility means you won't paint yourself into a corner.

---

## API Design: The Contract Between Components

The API between components (whether HTTP/REST, gRPC, or internal function calls) is a contract. Design it carefully because changing it is expensive — every consumer must adapt.

**Design principles that matter**:

**Be explicit about what each endpoint does.** `POST /shorten` takes a URL and returns a short code. Not `POST /urls` which might create, update, or delete depending on the body — that's ambiguous.

**Version from day one.** Even if you only have v1, putting version in the path (`/v1/shorten`) costs nothing and saves enormous pain later.

**Return meaningful errors.** A 500 with no body is useless. A 400 with `{"error": "url field is required"}` is actionable.

**Design for the client, not the database.** Don't expose your database schema as your API. The API should represent the domain concepts ("shorten a URL"), not the implementation ("insert into urls table").

---

## Thinking About Failure

For every component in your system, ask:
- **What happens when this fails?** Does the whole system go down? Does one feature degrade?
- **How do we detect the failure?** Health checks? Metrics? Error rates?
- **How do we recover?** Automatically (failover to replica) or manually (page an engineer)?
- **How long can we be down?** Seconds? Minutes? Hours?

These questions define your **failure domain architecture**. Components that must never fail together should be isolated from each other. Components that can tolerate brief outages can have simpler (cheaper) redundancy.

A well-designed system has no single point of failure on its critical path. The database has replicas. The web tier has multiple instances behind a load balancer. The cache has replication or fallback to database. DNS has multiple nameservers.

---

## The Architecture Review Checklist

When evaluating any architecture — your own or someone else's — work through these questions:

1. **What are the top 3 access patterns?** The architecture should be optimized for these.
2. **Where is the single source of truth for each entity?** Every piece of data should have one authoritative location.
3. **What happens at 10x the current load?** Which component breaks first?
4. **What happens when [any component] goes down?** Trace each failure.
5. **Where are the synchronous dependencies?** These are the fragile points.
6. **What's the blast radius of a bad deployment?** Can you roll back quickly?
7. **How does data flow through the system?** Follow a single request from client to storage and back.

These questions won't give you the right architecture — but they'll quickly reveal problems in a wrong one.

In the next lesson, we'll look at the major architectural styles (monoliths, microservices, event-driven, serverless) — not as a catalog, but as different answers to the decomposition question, each with concrete trade-offs.
