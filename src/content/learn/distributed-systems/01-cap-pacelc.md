---
id: ds-cap-pacelc
title: "CAP and PACELC Without the Magical Triangle"
track: distributed-systems
module: consistency
level: intermediate
duration: 25
prerequisites: []
concepts: [cap, pacelc, consistency, availability, partition-tolerance, network-partitions, linearizability]
tags: [distributed-systems, consistency, architecture, pacelc]
interactive:
  type: tradeoff-game
  enabled: true
order: 1
---

# CAP and PACELC Without the Magical Triangle

For decades, software engineers were taught the **CAP Theorem** through a geometric triangle diagram accompanied by the slogan: *"Pick any two: Consistency, Availability, Partition Tolerance."*

This formulation is fundamentally misleading. In real-world networks traversing physical routers, switches, and under-sea fiber cables, **Partition Tolerance (P) is non-negotiable**. Network cables get cut, routers drop packets, and servers crash. You cannot "choose" CA. When a network partition occurs, you must choose between:
1. **Consistency (C)**: Refusing writes and reads if replicas cannot coordinate, guaranteeing that no client ever reads stale or contradictory data.
2. **Availability (A)**: Continuing to accept reads and writes on isolated nodes, accepting that data will diverge and split-brain inconsistencies will emerge.

---

## The PACELC Theorem: Evaluating Normal Operation

Formulated by Daniel Abadi in 2012, the **PACELC Theorem** extends CAP to answer what happens **when the network is completely healthy**:

```
If Partition (P):
    Trade off: Availability (A)  vs  Consistency (C)
Else (E):
    Trade off: Latency (L)       vs  Consistency (C)
```

The "Else" clause is critical because distributed systems spend 99.9% of their operational lifespan running in a healthy state. Even with zero network partitions, you still face an immutable physical trade-off:
- Do you want **Strong Consistency** (forcing every write to replicate synchronously across 3 datacenters before responding, paying $100\text{ms}$ in network latency)?
- Or do you want **Low Latency** (acknowledging writes immediately in local memory and replicating asynchronously in the background, risking temporary stale reads)?

---

## Real-World Database Classification

| System | Classification | Partition Mode | Normal Mode | Ideal Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Google Spanner** / **CockroachDB** | **CP / PC** | Preserves Consistency | Preserves Consistency | Financial ledgers, banking transfers, balance sheets |
| **Apache Cassandra** (Default) | **AP / PA** | Preserves Availability | Optimizes Latency | High-velocity metrics, IoT telemetry, social feeds |
| **MongoDB** (W: Majority) | **CP / PC** | Preserves Consistency | Preserves Consistency | Inventory reservation, order tracking |
| **Amazon DynamoDB** (Eventual) | **AP / PA** | Preserves Availability | Optimizes Latency | Shopping cart state, user session profiles |

---

## Consistency Levels Spectrum

Consistency is not a binary toggle between "100% Strong" and "Complete Chaos". Distributed databases offer a spectrum:

1. **Linearizability (Strict Serializability)**: The strongest guarantee. Operations appear to execute atomically at a single instant in time globally.
2. **Sequential Consistency**: Operations appear in the order submitted by individual processes, but different nodes may observe events with a slight uniform lag.
3. **Causal Consistency**: Causally related operations (e.g., a question followed by an answer) are guaranteed to be seen in order; concurrent unrelated writes can be seen in any order.
4. **Read-Your-Own-Writes Consistency**: A user is guaranteed to immediately see their own profile updates or comments, even if other users around the world observe eventual propagation.
5. **Eventual Consistency**: If no new updates are made, all replicas will eventually converge to the same value.

---

## Interactive Architecture Trade-Off Game

Use the **Architecture Trade-Off Game** above to test your architectural decision-making across real-world enterprise scenarios:
- Real-time multiplayer gaming leaderboards
- Banking account ledgers
- User profile picture uploads
- Audit and compliance log streams
