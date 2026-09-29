---
id: expert-architecture-reviews
title: "Architecture Decision Records and Technical Reviews"
track: expert
module: engineering-leadership
level: expert
duration: 20
prerequisites: [hld-architecture-styles]
concepts: [adr, architecture-review, technical-debt, rfc, design-doc, decision-making]
tags: [expert, architecture, decision-records, reviews, leadership]
interactive:
  type: adr-template
  enabled: true
order: 1
---

# Architecture Decision Records and Technical Reviews

As systems grow, the biggest risk isn't making wrong technical decisions — it's making decisions that nobody remembers the reasoning behind, leading to future teams repeating the same mistakes or undoing work without understanding why it was done.

**Architecture Decision Records (ADRs)** and **technical design reviews** are the tools that preserve decision context and enable informed evolution.

---

## Architecture Decision Records (ADRs)

An ADR documents a single architectural decision: what was decided, why, what alternatives were considered, and what the consequences are.

```markdown
# ADR-0042: Use PostgreSQL Instead of MongoDB for the Order Service

## Status: Accepted

## Context
The Order Service needs a database. We considered PostgreSQL (relational) 
and MongoDB (document). Our order data has complex relationships (orders → 
line items → products → inventory), and we need ACID transactions for 
order creation (debit inventory + create order atomically).

## Decision
Use PostgreSQL.

## Rationale
- Order data has clear relational structure (orders, line items, products)
- We need multi-table transactions (ACID) for order creation
- The team has strong PostgreSQL expertise
- Our existing infrastructure already includes PostgreSQL

## Alternatives Considered
- **MongoDB**: Better for hierarchical data, but lacks multi-document ACID 
  transactions (at the time of this decision). Doesn't fit our relational 
  data model well.
- **DynamoDB**: Excellent scalability, but limited query flexibility. Our 
  reporting needs require complex joins.

## Consequences
- We accept the operational burden of managing PostgreSQL (backups, 
  replication, connection pooling)
- We'll need to shard if order volume exceeds single-instance capacity 
  (estimated at 2+ years based on growth projections)
- The team can leverage existing PostgreSQL tooling and expertise
```

**Why ADRs matter**: Two years from now, a new engineer will ask "why didn't we use MongoDB?" Without an ADR, the answer is lost. The new engineer might spend weeks investigating MongoDB migration, only to rediscover the same reasons. Or worse, they might migrate without understanding the original constraints, breaking the transaction guarantees.

**ADR best practices**:
- Number them sequentially (ADR-0001, ADR-0002, ...)
- Keep them short (one page)
- Store them in the repository alongside the code they describe
- ADRs are immutable — if a decision is reversed, write a new ADR that supersedes the old one (don't edit the original)

---

## Design Documents (RFCs)

For larger decisions — introducing a new service, changing a core abstraction, adopting a new technology — a design document (often called an RFC, "Request for Comments") provides more detail than an ADR.

**Structure**:
1. **Problem statement**: What problem are we solving? Why now?
2. **Goals and non-goals**: What will this achieve? What is explicitly out of scope?
3. **Proposed solution**: The technical approach, with diagrams
4. **Alternatives considered**: Other approaches and why they were rejected
5. **Migration plan**: How do we get from here to there?
6. **Risks and mitigations**: What could go wrong?
7. **Open questions**: What do we need input on?

The goal of a design doc isn't to get approval — it's to get feedback. The best design docs surface problems the author didn't see, by exposing the thinking to diverse perspectives.

---

## Technical Debt: Making It Visible

Technical debt isn't inherently bad. Taking shortcuts to ship faster is a valid strategy — as long as you track the debt and plan to pay it down.

**Make debt visible**: Maintain a tech debt registry (a simple spreadsheet or issue tracker). For each item:
- What's the debt?
- What's the impact? (slows development? increases incidents? limits scaling?)
- What's the cost to fix?
- What triggers urgency? ("If we hit 10x traffic, this breaks")

**Categorize debt**:
- **Reckless/deliberate**: "We know this is wrong but we're shipping it anyway" — the most dangerous kind. Document it loudly.
- **Prudent/deliberate**: "We'll ship with a simpler approach and refactor later" — legitimate if tracked.
- **Reckless/inadvertent**: "We didn't know this was a problem" — learned after the fact. Fix when discovered.
- **Prudent/inadvertent**: "Now we know how we should have built it" — natural learning. Plan the refactor.

---

## The Architecture Review Process

Regular architecture reviews prevent drift — the gradual divergence between the intended architecture and the actual system.

**What to review**:
- New services being introduced
- Significant changes to data models
- New external dependencies
- Changes to communication patterns between services
- Security-sensitive changes

**How to review**:
- The author presents the design doc
- Reviewers ask questions focused on: trade-offs, failure modes, scalability, operational impact
- The outcome is either "approved," "approved with conditions," or "needs revision"
- Decisions are recorded as ADRs

The most valuable reviews are collaborative, not adversarial. The goal is to make the design better, not to prove it's wrong.

---

## Building Architectural Judgment

Architectural judgment — the ability to make good design decisions quickly — comes from:

1. **Breadth of experience**: Seeing many different systems and their failure modes
2. **Understanding trade-offs**: Every choice has costs. The skill is knowing which costs are acceptable for your context
3. **Learning from failures**: Post-incident reviews that honestly examine what went wrong and why
4. **Reading others' work**: ADRs, design docs, and case studies from other companies

This platform has tried to build your breadth — from foundations through databases, distributed systems, caching, messaging, reliability, and beyond. The real learning continues when you apply these concepts to real systems and discover the nuances that no course can fully capture.
