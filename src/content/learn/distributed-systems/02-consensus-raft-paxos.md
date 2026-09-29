---
id: distributed-systems-consensus
title: "How Distributed Systems Agree on Anything"
track: distributed-systems
module: consensus
level: advanced
duration: 30
prerequisites: [distributed-systems-cap-pacelc]
concepts: [consensus, raft, paxos, leader-election, log-replication, split-brain, quorum]
tags: [advanced, distributed-systems, consensus, raft, paxos, leader-election]
interactive:
  type: consensus-simulator
  enabled: true
order: 2
---

# How Distributed Systems Agree on Anything

Here's a question that sounds almost philosophically simple:

**Can five computers agree on what time it is?**

Not the exact UTC time — just, "what's the current time, to the nearest second, that we all agree on?"

If the machines are synchronized by NTP, sure, they'll be within a few milliseconds of each other. But "a few milliseconds off from each other" is not the same as "they agree." If Machine A says 10:00:00.000 and Machine B says 10:00:00.003, they don't agree. They're close, but in distributed systems, "close" is not "same."

And if one of the machines is temporarily disconnected from NTP, or has a broken clock, or is under heavy load and hasn't processed the NTP update yet — now you have machines with diverging clocks. Which one is "correct"?

This is a toy version of a much deeper problem: **how do distributed systems agree on the value of anything — not just time, but transactions, leaders, configurations, or data?**

The answer is **consensus protocols**, and they're among the most elegant and hard-won results in computer science.

---

## Why Agreement Is Hard

Let's say you have 5 database nodes, and they all need to agree on "the value of key X is 42."

In a single-process program, agreement is trivial — you just update the variable. No coordination needed.

In a distributed system, you have to send messages. And messages can:
- Arrive late
- Arrive out of order
- Not arrive at all (dropped by the network)
- Arrive multiple times (network retry)

And the machines themselves can:
- Crash in the middle of an operation
- Come back up after crashing with partial state
- Run slowly (so slow they look crashed, but aren't)
- Have bugs that cause them to behave incorrectly

The formal version of this problem is sometimes called the **Byzantine Generals Problem** (where nodes can actively lie) but in practice we care about the simpler **crash-fault tolerance** version, where nodes can crash but don't send false information.

Even in this simpler version, the key mathematical result is this:

> **To tolerate `f` node failures, you need at least `2f + 1` nodes.**

If you want to tolerate 2 node failures, you need at least 5 nodes. Here's why:

With 5 nodes and 2 failures, you have 3 nodes remaining. 3 is a majority of 5 (you need more than half). A majority can still agree among themselves, independently of the failed nodes. Without a majority requirement, failed nodes could cause a "split brain" — where different subsets of nodes think different things are true, and there's no way to know which subset is "correct."

---

## The Leader Approach: Simplify by Having One Authority

The most practical approach to consensus is to designate one node as the **leader** and route all writes through it.

The leader makes decisions. The leader tells followers what to do. Followers replicate what the leader tells them. If you can trust the leader, agreement is easy.

But: what if the leader fails?

You need **leader election** — a process by which the remaining nodes agree on a new leader.

And you need leader election to be correct. Specifically:
- **Safety**: At most one leader at a time. Two leaders simultaneously is called a "split brain" and is catastrophic — they'd both accept writes, which would diverge.
- **Liveness**: Eventually, a leader is elected. The system doesn't get stuck.

Here's the cruel irony: electing a leader *is a consensus problem*. You need consensus to have a leader, but you need a leader to have consensus. It's turtles all the way down.

This is why consensus algorithms are subtle — they need to bootstrap the agreement process from scratch, without a leader to coordinate, every time the leader fails.

---

## Paxos: The Original Consensus Algorithm

**Paxos**, invented by Leslie Lamport in 1989 (published 1998), was the first practical consensus algorithm for crash-fault-tolerant systems.

It works in two phases:

**Phase 1 (Prepare/Promise)**:
1. A node that wants to be leader sends a "Prepare" message to all nodes with a unique, incrementing number (e.g., "Prepare(5)")
2. Each other node that hasn't already promised to a higher number responds: "Promise — I won't accept proposals numbered lower than 5. If I've already accepted any values, here's what they were."

**Phase 2 (Accept/Commit)**:
3. If the proposer gets promises from a majority of nodes, it sends "Accept(5, value)" — using the value from the highest-numbered previous accepted value (if any), or a new value if there was none
4. If a majority of nodes accept, the value is chosen

The protocol is safe because of the majority requirement: any two majorities overlap in at least one node. That overlapping node is the "witness" that ensures both majorities agree.

Paxos is provably correct and has been used in systems like Google Chubby (their distributed lock service) and Apache ZooKeeper. But it has a reputation for being hard to understand and even harder to implement correctly. Lamport himself wrote a 2001 paper called "Paxos Made Simple" precisely because the original presentation was so difficult.

Even "simple" Paxos leaves many details unspecified: how do you handle multiple concurrent proposals? How do you detect leader failure? How does a new node join the cluster and get up to date? Filling in these details correctly is where most implementations go wrong.

---

## Raft: Consensus Designed to Be Understandable

In 2013, Diego Ongaro and John Ousterhout designed a new consensus algorithm with an explicit goal: **understandability**. They called it Raft.

Raft makes different design choices than Paxos — it's more prescriptive and leaves fewer gaps — specifically to make it easier to understand and implement correctly.

The key insight of Raft: **decompose the consensus problem into three sub-problems, each solved independently**:

1. **Leader election**: How does the cluster choose a leader?
2. **Log replication**: How does the leader replicate its log to followers?
3. **Safety**: What invariants ensure the system doesn't do anything incorrect?

### Leader Election in Raft

Each node is in one of three states: **Leader**, **Follower**, or **Candidate**.

Initially, all nodes are Followers. They each set a random **election timeout** (say, between 150ms and 300ms). If a Follower doesn't hear from a Leader before its timeout expires, it assumes the leader has failed and starts an election.

An election works like this:
1. The timeout-expired node becomes a **Candidate**
2. It increments its **term number** (a monotonically increasing counter)
3. It votes for itself and sends "RequestVote(term=X)" to all other nodes
4. Each node grants a vote if it hasn't voted in this term and the candidate's log is at least as up-to-date as its own
5. If the Candidate gets votes from a majority: it becomes the new **Leader**
6. The new Leader immediately starts sending **heartbeat messages** to all Followers to establish authority and reset their election timeouts

The random election timeout prevents "split votes" where all nodes start elections simultaneously and nobody wins. With random timeouts, one node will almost always start an election before the others and win before they even start.

### Log Replication in Raft

Once a leader is elected, all client writes go to the leader. The leader:

1. Appends the write to its own **log** (an ordered list of operations)
2. Sends **AppendEntries** RPCs to all followers with the new log entry
3. Waits for acknowledgment from a majority of nodes
4. Once a majority has acknowledged: the entry is **committed** — it's guaranteed to be durable even if the leader fails
5. The leader tells followers the entry is committed; followers apply it to their state machines
6. The leader responds to the client that the write succeeded

This log — and the commitment protocol — is the heart of Raft. Any change to the system state goes through this log, in order. All nodes that have applied the same log entries have identical state. That's the invariant that makes Raft correct.

### Safety: Why Split-Brain Can't Happen

The key safety property: **a node can only become leader if it has all committed entries in its log**.

This is enforced by the voting rule: a node only grants a vote if the candidate's log is at least as up-to-date as its own. A node with a stale log can't win a majority of votes from nodes that have more up-to-date logs.

Combined with the requirement that committed entries have been acknowledged by a majority: there's always an overlap node in any two majorities. If a value was committed, at least one node in any future majority saw it. That node will refuse to vote for a leader that doesn't have it.

---

## The Split-Brain Nightmare

The most catastrophic failure mode in any distributed system using leader-based consensus is **split-brain**: two nodes simultaneously believe they are the leader.

This can happen during a network partition where some nodes can reach each other and some can't. If the groups are each large enough to form a "majority" independently (which doesn't happen with proper Raft, but can happen with misconfigured systems), both might elect their own leader. Both leaders accept writes. The logs diverge. When the partition heals, you have two conflicting histories.

Raft prevents this by requiring that a leader must always have a quorum (majority) of nodes to commit anything. If the cluster splits into two groups, only the majority group can form quorum. The minority group's "leader" (if it has one) can't commit any writes. When the partition heals, the minority group nodes see the majority group's higher term number and immediately step down.

**Fencing tokens** add an additional layer of protection in systems where a node might "think" it's still leader due to a slow GC pause or clock issue. Each leader gets an incrementing token. External resources (like a distributed lock or storage system) reject operations from any leader with a lower token than the most recent one they've seen. Even if an old "zombie leader" tries to operate, it gets rejected.

---

## What Consensus Costs

Raft and Paxos are correct, but they're not free. Every committed write requires a round-trip to a majority of nodes. For a 5-node cluster where nodes are in different datacenters:

- Intra-datacenter round-trip: ~0.5ms
- Cross-datacenter round-trip: ~50-100ms

Every write incurs at least one of these round-trips. Strong consistency through consensus has a latency floor determined by network distance.

This is the "Else" part of PACELC: even when there's no partition, choosing strong consistency means paying in latency.

For many workloads, this is fine — the correctness guarantee is worth 50ms of additional latency per write. For others (low-latency trading systems, real-time games), it's unacceptable.

The systems that need consensus (ZooKeeper, etcd, Consul) accept this latency cost because they're storing configuration data and distributed locks — things that genuinely need to be correct, and aren't written frequently enough for the latency to matter much.

---

## Where Raft Is Used

Raft has become the consensus algorithm of choice for most modern systems:
- **etcd**: Kubernetes's configuration store
- **CockroachDB**: Distributed SQL database
- **TiKV**: The storage layer of TiDB
- **HashiCorp Consul**: Service mesh and configuration
- **RethinkDB**: Distributed document database

Paxos is still used in older systems (Chubby, some Google systems) and in variants like Multi-Paxos. But Raft's understandability advantage has made it the default for new implementations.

---

## The Bigger Lesson

Consensus algorithms exist because agreement in distributed systems is genuinely hard — not just "we haven't figured it out yet" hard, but mathematically hard, with proven lower bounds on what's achievable.

The key insights to hold on to:
- **Majorities are the unit of durability**: Once a majority has acknowledged something, it survives any minority failure
- **Monotonically increasing terms/epochs**: How systems tell the difference between old leaders and new ones
- **Log ordering**: The key invariant — if two nodes have applied the same log prefix, they have identical state
- **Latency costs**: Consensus requires network round-trips; strong consistency has a latency floor

Understanding consensus makes many other distributed systems patterns obvious: Why does Kafka need a leader for each partition? How does ZooKeeper guarantee its promises? Why does DynamoDB use a quorum-based approach instead of consensus? These are all instances of the same fundamental problem.

In the next lesson, we shift from theoretical foundations to practical failure — how systems break, how they detect breaks, and how they recover.
