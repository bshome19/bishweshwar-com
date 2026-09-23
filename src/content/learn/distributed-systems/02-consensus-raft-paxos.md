---
id: ds-consensus-raft-paxos
title: "Distributed Consensus: Raft, Paxos, and State Machine Replication"
track: distributed-systems
module: consensus
level: advanced
duration: 35
prerequisites: [ds-cap-pacelc]
concepts: [consensus, raft, paxos, leader-election, log-replication, quorum, split-brain, state-machine-replication]
tags: [distributed-systems, consensus, raft, etcd, zookeeper]
order: 2
---

# Distributed Consensus: Raft, Paxos, and State Machine Replication

In a single server, state management is trivial: a CPU writes a variable to RAM, or a disk head writes bytes to an append-only file.

In a distributed cluster of 5 independent servers connected by untrusted networks, how do all nodes agree on the exact same sequence of state changes—even when individual machines crash, recover, or experience intermittent network partitions?

This fundamental challenge is **Distributed Consensus**.

---

## 1. The State Machine Replication (SMR) Principle

Consensus algorithms do not attempt to replicate arbitrary memory states directly. Instead, they enforce **State Machine Replication**:

```
Client Proposal ("SET balance = 100")
            │
            ▼
┌────────────────────────┐
│ Replicated Log Engine  │ ◄──► Consensus Protocol (Raft / Paxos)
└────────────────────────┘      Guarantees exact same log order across all nodes
            │
            ▼
┌────────────────────────┐
│ Deterministic State    │ ───► Applying the identical sequence of deterministic log
│ Machine (DB / Key-Val) │      entries produces the identical state on all 5 nodes!
└────────────────────────┘
```

If five identical deterministic state machines process the exact same sequence of log entries starting from an initial state $S_0$, they are mathematically guaranteed to arrive at the exact same final state $S_N$.

---

## 2. Quorums: Preventing Split-Brain

Consensus algorithms rely on **majority quorums** to tolerate node failures without sacrificing safety.

For a cluster of $N$ nodes, the minimum quorum required to make any binding decision is:

$$Q = \left\lfloor \frac{N}{2} \right\rfloor + 1$$

- A cluster of **3 nodes** has a quorum of 2 and can tolerate **1 failure**.
- A cluster of **5 nodes** has a quorum of 3 and can tolerate **2 failures**.
- A cluster of **7 nodes** has a quorum of 4 and can tolerate **3 failures**.

### The Pigeonhole Principle
Any two majorities of size $Q$ in a cluster of $N$ nodes must overlap by at least **one common node**. This overlap guarantees that if a network partition splits a 5-node cluster into two factions (e.g., 3 nodes in Datacenter A and 2 nodes in Datacenter B):
- Datacenter A holds a majority ($3 \ge 3$) and continues electing leaders and accepting commits safely.
- Datacenter B cannot form a majority ($2 < 3$) and immediately rejects client writes, preventing catastrophic **split-brain** data corruption!

---

## 3. The Raft Consensus Algorithm Explained

While Paxos was notoriously difficult to understand and implement in production, Ongaro and Ousterhout created **Raft** in 2014 with an explicit emphasis on understandability. Raft powers modern infrastructure backbones including **etcd** (Kubernetes), **HashiCorp Consul**, **CockroachDB**, and **TiKV**.

Raft decomposes consensus into three independent sub-problems:

```
                  ┌───────────────────────────────┐
                  ▼                               │
┌───────────┐  Times out, starts election    ┌─────────┐  Discovers leader
│ Follower  │ ──────────────────────────────►│ Candidate│  or higher term
└───────────┘                                └─────────┘ ─────────────────┐
      ▲                                           │                       │
      │                                           │ Receives votes from   │
      │                                           │ majority of nodes     │
      │                                           ▼                       │
      │                                      ┌─────────┐                  │
      └──────────────────────────────────────│ Leader  │                  │
               Discovers higher term         └─────────┘                  ▼
```

### 1. Leader Election
- All nodes start as **Followers**. Every follower runs a randomized election timer ($150\text{ms} - 300\text{ms}$).
- If a follower hears no heartbeat from a Leader before its timer expires, it increments its `Term` counter, converts to a **Candidate**, votes for itself, and broadcasts `RequestVote` RPCs.
- The randomized timer ensures that one node almost always times out before its peers, avoiding vote-splitting ties.
- The candidate that secures votes from a majority of nodes becomes the authoritative **Leader** for that term.

### 2. Log Replication
- Clients send all proposals exclusively to the Leader.
- The Leader appends the entry to its local log and sends `AppendEntries` RPCs to all Followers.
- Once a majority of followers acknowledge writing the entry to their local disk logs, the Leader **commits** the entry, applies it to its state machine, and returns success to the client.
- Followers apply the entry to their state machines upon receiving the Leader's next heartbeat confirming the commit.

### 3. Safety Guarantees
- A follower will refuse to vote for any candidate whose log is less up-to-date than its own log.
- This **Election Safety Invariant** guarantees that any elected leader is mathematically guaranteed to already possess every single committed entry from all previous terms! Committed entries are never overwritten or lost.
