---
id: distributed-systems-cap-pacelc
title: "The Hard Problems of Distributed Systems"
track: distributed-systems
module: consistency-and-availability
level: intermediate
duration: 28
prerequisites: [databases-sharding-consistent-hashing]
concepts: [cap-theorem, consistency, availability, partition-tolerance, pacelc, linearizability, eventual-consistency]
tags: [intermediate, distributed-systems, cap, consistency, availability]
interactive:
  type: cap-theorem
  enabled: true
order: 1
---

# The Hard Problems of Distributed Systems

In 1996, a programmer named Peter Deutsch wrote a list of assumptions that programmers new to distributed computing make. He called them the "Fallacies of Distributed Computing." They were:

1. The network is reliable.
2. Latency is zero.
3. Bandwidth is infinite.
4. The network is secure.
5. Topology doesn't change.
6. There is one administrator.
7. Transport cost is zero.
8. The network is homogeneous.

Every single one of these is false. And the consequences of believing any of them, even briefly, are systems that fail in mysterious ways.

But there's one assumption even more fundamental than these: **that the system has a single, consistent view of reality**.

When you're writing a single-process program, this is trivially true. You have variables. They have values. When you read a variable, you get its current value. That's it.

Add a second machine, and you've lost this. You now have two machines that each have their own view of reality, connected by a network that is unreliable, has non-zero latency, and occasionally partitions entirely. Keeping their views consistent is not just an implementation challenge — it runs into mathematical limits.

This lesson is about those limits, and what they mean for building real systems.

---

## The Problem: Three Things You Want, Two You Can Have

Let's build up to the CAP theorem from a concrete scenario.

You have a distributed key-value store running on two machines: Node A and Node B. Your data is replicated — both nodes have a copy of everything.

A client writes: `set("username", "alice")` — this goes to Node A.

Immediately after, another client reads: `get("username")` — this goes to Node B.

What should Node B return?

If Node A has already propagated the write to Node B: `"alice"`. Correct.

If the write hasn't propagated yet (network delay, or Node A is slow): Node B would return the old value (or nothing). Incorrect, from the client's perspective.

If the network between A and B is completely down (a "network partition"): Node B can't receive updates from Node A at all. Now what?

You have a choice: **return Node B's stale value anyway** (available but inconsistent), or **refuse to serve requests** until the network recovers (consistent but unavailable).

This is the core tension. The **CAP theorem**, formalized by Eric Brewer in 2000 and later proved by Gilbert and Lynch, states that in the presence of a network partition, you cannot have both Consistency and Availability simultaneously. You must choose one.

---

## Understanding the Three Terms

The CAP theorem is simultaneously famous, important, and commonly misunderstood. The misunderstanding usually comes from not being precise about what each term means.

**Consistency (in CAP)**: Every read receives the most recent write or an error. This is specifically about a property called **linearizability** — the guarantee that operations appear to happen instantaneously and atomically, in a single global order. Any read after a write completes must reflect that write.

This is *not* the same as the C in ACID (which is about data integrity constraints like foreign keys). These are different "consistency" concepts with the same word, which causes enormous confusion.

**Availability (in CAP)**: Every request receives a response (not necessarily the most recent write). The system doesn't reject requests. It might return stale data, but it returns *something*.

**Partition Tolerance**: The system continues operating even if some network messages are dropped or delayed. This is *not really a choice* — network partitions happen in all real distributed systems. You cannot opt out. Therefore, partition tolerance is assumed, and the real choice is between Consistency and Availability during a partition.

So CAP is really: **in the presence of a network partition, choose Consistency or Availability**.

---

## What "Choosing Consistency" Looks Like

A system that prioritizes consistency during a partition will refuse to serve requests rather than return potentially stale data.

Imagine you're a bank. You have two datacenters, East and West, each with a copy of account balances. The network connection between them goes down.

A consistency-favoring system says: **I cannot verify that my data is current**. If I serve reads, I might tell you your balance is $1000 when a transfer that happened 10 seconds ago should have made it $500. That's a problem. So I will refuse to serve requests until connectivity is restored.

Users see an error. That's painful. But the alternative — potentially telling users wrong balances — is worse for a bank.

Systems that favor consistency: traditional relational databases (when properly configured), Google Spanner, ZooKeeper, etcd.

---

## What "Choosing Availability" Looks Like

A system that prioritizes availability during a partition continues serving requests even though it can't guarantee freshness.

Imagine you're Twitter. Your East Coast datacenter loses connectivity to your West Coast datacenter.

An availability-favoring system says: **I'll continue serving tweets from my local state**. West Coast users might not see a tweet posted 5 seconds ago by someone on the East Coast. But they can still read tweets, post their own, and use the app. The missing tweet will appear when connectivity is restored.

That's a reasonable trade-off for Twitter. The alternative — refusing to serve any tweets because you can't guarantee consistency — would mean Twitter is effectively down for everyone. That's far worse.

Systems that favor availability: Cassandra, DynamoDB, CouchDB, most DNS.

---

## The Problem with CAP: The Real World Is More Nuanced

The CAP theorem, as commonly presented, makes it sound like you pick a "camp" — consistency or availability — and live with it. The reality is much more subtle.

**First**: Partitions don't happen constantly. In normal operation, you can have both consistency and availability. CAP only applies when a partition is actually occurring, which might be 0.01% of the time.

**Second**: Consistency exists on a spectrum. You don't just choose "consistent" or "inconsistent" — you choose what *level* of consistency you need:

- **Linearizability**: The strongest. Every read reflects the most recent write, globally. Very expensive.
- **Sequential consistency**: Operations appear in some global order, but not necessarily real-time. Slightly weaker, slightly cheaper.
- **Causal consistency**: If B happened after A (and B knows about A), any observer that sees B must have seen A first. Much cheaper.
- **Eventual consistency**: Given no new updates, all replicas will eventually converge. The weakest guarantee, but very cheap.

Most real-world systems aren't "CP" or "AP" — they choose different consistency levels for different operations.

---

## PACELC: The Better Mental Model

The **PACELC theorem** (Daniel Abadi, 2012) is a more complete framing:

> If there is a **P**artition, choose between **A**vailability and **C**onsistency. **E**lse (when the system is running normally), choose between **L**atency and **C**onsistency.

The "Else" part is crucial. It adds the insight that even when there's no partition, you still face a trade-off: strong consistency requires coordination between nodes (to ensure every node agrees before a write is "complete"), and coordination takes time — it adds latency.

**Example**: A distributed database with strong consistency might work like this:
1. Client sends write to Node A
2. Node A forwards to all other nodes
3. All nodes acknowledge they've received it
4. Node A tells the client "write complete"

Step 3 requires waiting for a network round-trip to every node. That's latency added to every single write. You're paying for consistency in milliseconds.

**The PACELC framing**:
- **PA/EL** (Partition: Availability; Else: Latency): Choose availability during partitions, and accept higher latency for consistency in normal operation. Cassandra (configurable), DynamoDB.
- **PC/EC** (Partition: Consistency; Else: Consistency): Prioritize consistency both during partitions and in normal operation. Higher latency but always correct. Google Spanner, traditional relational databases.
- **PA/EC** (Partition: Availability; Else: Consistency): Choose availability during partitions, but in normal operation pay for consistency. Some systems offer this.

Most real distributed systems with tunable consistency (like Cassandra) let you pick per-operation: "I want this read to be strongly consistent" vs "I'm okay with eventual consistency for this one."

---

## The Two-General Problem: Why Perfect Consistency Is Sometimes Impossible

Here's a beautiful theoretical result that shows some consistency problems have no solution.

Imagine two armies (Army A and Army B) plan to attack a city simultaneously. They must both attack at the same time or they'll both lose. They can only communicate by sending messengers through enemy territory — and any messenger might be captured (message lost).

Army A decides to attack tomorrow at dawn. It sends a messenger to Army B: "Attack at dawn." But A doesn't know if the message got through. So it can't commit to the attack without confirmation from B.

Army B receives the message. It sends back a confirmation: "Confirmed, attacking at dawn." But now B doesn't know if its confirmation got through. If A doesn't receive the confirmation, A might not attack.

So A sends a confirmation of the confirmation. But now A doesn't know if *that* got through...

This regress is infinite. **No matter how many acknowledgments are exchanged over an unreliable channel, neither party can be certain the other has committed.** The only way to achieve certainty is a reliable communication channel — which we assumed doesn't exist.

This is directly analogous to distributed databases. A two-phase commit (2PC) — a common protocol for distributed transactions — faces this exact problem. The coordinator sends "prepare to commit" to all nodes. Nodes say "ready." Coordinator sends "commit." But if the coordinator crashes after some nodes committed and before others did, you're stuck. Some nodes committed, some didn't, and you can't be sure which.

**The practical implication**: Distributed transactions that require all-or-nothing across multiple nodes are either slow (they require coordination with multiple round-trips) or potentially stuck (if a participant crashes at the wrong moment). This is a fundamental limit, not an implementation bug.

---

## What This Means Practically

When you're designing a distributed system, the question isn't "which consistency model do I want?" It's "what consistency properties does each operation actually *need*, and what's the cheapest way to provide them?"

**Reads that can be slightly stale**: Use eventual consistency. Serve reads from the nearest replica without any coordination. Fast, cheap. If a user's friend count is off by 1 for 2 seconds, that's acceptable.

**Reads that must be accurate**: Use a quorum read — require that a majority of replicas agree before returning a result. Slower, but correct.

**Writes that must be atomic**: Pay for coordination (2PC or consensus protocol like Raft). Slow, complex, but correct.

**Writes that can be concurrent and resolved later**: Use CRDTs (Conflict-free Replicated Data Types) — data structures that can be merged without coordination, like counters or sets. Fast, cheap, but only works for specific data types.

Most large-scale systems are built with different consistency requirements for different parts. The shopping cart (eventual consistency is fine if it's a bit stale). The payment system (strong consistency, every time). The recommendation engine (eventual consistency is completely fine). The inventory count when clicking "buy" (strong consistency, or you oversell).

---

## The Mindset Shift

The hardest mental shift when working with distributed systems isn't learning the algorithms. It's accepting that **consistency is a spectrum, not a binary**, and that **the right consistency level depends on what your users will actually notice and care about**.

A social media "like count" that's off by a few for a second? Nobody cares. Your bank account balance being off by any amount, for any duration? Catastrophic.

This is why understanding the actual semantics of your operations matters as much as understanding the technology. The right consistency level is a product decision as much as a technical one.

In the next lesson, we'll look at consensus protocols — how a cluster of machines can agree on anything despite unreliable networks and crashing nodes. Spoiler: it's one of the hardest problems in distributed systems, and the algorithms (Raft, Paxos) are elegant precisely because of how carefully they handle failure.
