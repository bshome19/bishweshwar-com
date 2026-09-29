---
id: databases-sharding-consistent-hashing
title: "When One Database Isn't Enough"
track: databases
module: distributed-storage
level: intermediate
duration: 22
prerequisites: [databases-indexes-btrees-lsm]
concepts: [sharding, replication, consistent-hashing, replication-lag, cross-shard-joins, hotspot]
tags: [intermediate, databases, sharding, replication, scaling]
interactive:
  type: consistent-hashing
  enabled: true
order: 2
---

# When One Database Isn't Enough

There comes a moment in every growing system's life where someone says: "the database can't keep up."

This can mean different things:
- **Storage**: You're approaching the disk capacity of one machine
- **Write throughput**: More writes per second than one machine can handle
- **Read throughput**: More reads per second than one machine can serve
- **Latency**: Users in different geographic regions are far from your single database

The naive solution is "get a bigger machine" — a vertical scale up. And for a while, this works. Modern servers can have 192 CPU cores, 6TB of RAM, and 100TB of fast NVMe storage. These aren't small machines.

But vertical scaling has limits. There's a biggest machine you can buy. It costs a fortune. And it still has a single point of failure.

Eventually, you need multiple machines. And the moment you have multiple machines storing the same data, you've entered a fundamentally different world.

---

## Replication: The Same Data on Multiple Machines

The first approach to scaling a database is **replication** — making copies of your data on other machines.

The simplest model is **leader-follower replication** (also called primary-replica or master-slave):

```
Write: Client → Leader → (replicates to) → Follower 1
                                          → Follower 2
                                          → Follower 3

Read:  Client → any Follower
```

Writes go to the **leader** (one machine, the authority). The leader applies the write and sends it to **followers** (replicas) asynchronously or synchronously. Reads can be served by any follower, which distributes read load across multiple machines.

This is how most production databases work at moderate scale. It solves:
- **Read throughput**: Add more followers, distribute more reads
- **Availability**: If the leader fails, promote a follower to leader
- **Geographic latency**: Put followers in different regions close to users

But replication introduces a new category of problems that didn't exist before: **replication lag**.

---

## The Replication Lag Problem

Here's a scenario that happens constantly in production:

1. User updates their email address (write to leader)
2. User immediately clicks "refresh profile" (read from follower)
3. The follower hasn't received the update yet
4. User sees their old email

The write happened. The read came back with stale data. This is the most common consistency anomaly, and it's almost universally experienced as a bug by users.

This isn't a failure — it's expected behavior of **asynchronous replication**. The follower will eventually have the update. But "eventually" might be milliseconds, might be seconds, might be longer if the network is congested.

This is what people mean by **eventual consistency**: given enough time without new updates, all replicas will converge to the same state. But at any given moment, they might differ.

### Reading Your Own Writes

The email scenario is an instance of a specific anomaly: you wrote something, then immediately read it back and got the old value. This is called a **read-your-own-writes** violation.

The fix is conceptually simple: if you just made a write, route your next read to the leader (which definitely has the latest value). Many databases and ORMs can do this automatically — they'll route reads to the leader for a short period after you made a write.

But in a complex distributed system, this is harder than it sounds. Your write went to Service A. Your read goes to Service B. Service B doesn't know you just wrote to Service A. The "send reads to leader" logic doesn't cross service boundaries.

This is the beginning of the rabbit hole. Consistency problems in distributed systems are genuinely hard — they're not bugs to be fixed, they're trade-offs to be managed.

---

## Sharding: Splitting the Data Itself

Replication helps with reads and availability. But it doesn't solve the core problem if your bottleneck is **writes** — every write still has to go to the leader, and the leader can only handle so many writes per second.

And if your data is simply too large to fit on one machine, replication doesn't help at all (each machine needs to hold the full dataset).

The solution is **sharding** (also called partitioning): **splitting the data itself** across multiple machines.

Instead of every machine having a copy of all data, each machine has *a portion* of the data. No machine has everything.

```
Without sharding:      Machine A: [all 100M users]
                       Machine B: [all 100M users] (replica)

With sharding:         Shard 1: [users 1-25M]
                       Shard 2: [users 25M-50M]
                       Shard 3: [users 50M-75M]
                       Shard 4: [users 75M-100M]
```

Now each write goes to the specific shard that owns that data. Write throughput scales with the number of shards. Storage capacity scales with the number of shards.

But now you have a new problem: **how do you know which shard a given piece of data lives on?**

---

## Sharding Strategies

**Range-based sharding**: Assign ranges of keys to shards.
- Users A-F → Shard 1
- Users G-M → Shard 2
- Users N-S → Shard 3
- Users T-Z → Shard 4

Simple, and range queries are efficient (all users in a range are on one shard). But: **hotspots**. If most of your users have names starting with 'S', Shard 3 handles most of your traffic while Shards 1, 2, and 4 idle. The shards are unequally loaded.

**Hash-based sharding**: Hash the key and assign to a shard based on the hash value.
- Shard for user_id = hash(user_id) % num_shards

The hash function distributes keys randomly and uniformly. No hotspots. But range queries are now painful — users with consecutive IDs are scattered across all shards.

And there's a bigger problem.

---

## The Rehashing Disaster

Suppose you have 4 shards and use `shard = hash(user_id) % 4`.

You need to add a 5th shard because you're running out of capacity.

Now `shard = hash(user_id) % 5`.

Every existing user's shard assignment changes. The user who was on Shard 2 is now on Shard 4. The user who was on Shard 1 is now on Shard 0. Almost *all* data needs to move to different machines. This is catastrophic for a live system — you'd need to take it offline to migrate everything.

**This is the fundamental problem with simple modular hashing for sharding.**

---

## Consistent Hashing: The Elegant Solution

**Consistent hashing** was invented specifically to solve the rehashing problem. The insight is to represent the shards not as a simple modular assignment, but as positions on a **hash ring**.

Imagine the output space of your hash function (say, 0 to 2³²-1) arranged as a circle. Your shards are placed at positions on this circle. To find which shard owns a key, you:
1. Hash the key to get its position on the ring
2. Walk clockwise around the ring until you hit a shard
3. That shard owns the key

```
                    0
                    │
           ┌────────┴────────┐
    2^32*3/4                 2^32/4
        │      Shard A       │
    Shard D              Shard B
        │                    │
    2^32*2/4────────────────'
                  Shard C
```

Now, what happens when you add a new shard (Shard E) at some position on the ring?

Only the keys between Shard E and its predecessor shard need to move to Shard E. All other keys stay exactly where they are. Adding a shard means moving roughly `1/n` of the data (where n is the number of shards), not all of it.

### Virtual Nodes

In practice, placing each shard at one position on the ring creates uneven distributions — by chance, some shards end up responsible for large portions of the ring and others for small portions.

The fix is **virtual nodes**: each physical shard is represented by many positions on the ring (maybe 150 virtual nodes per shard). This smooths out the distribution and makes it much more even.

Virtual nodes also make adding machines elegant: a new physical shard takes over virtual nodes from many existing shards, spreading the data migration load evenly.

---

## The Cost of Sharding: Cross-Shard Queries

Sharding creates a serious query problem.

Suppose users are sharded by `user_id`. A user's data — their profile, their posts, their followers — is all on one shard. User-specific queries are fast.

But then you add a feature: "find all users in New York who joined in the last month."

That's a query that spans all users. Different users are on different shards. You'd have to query **every shard** and merge the results. For 100 shards, that's 100 queries, then merging and sorting the combined results.

Or consider joins. Your `users` table is sharded by `user_id`. Your `orders` table is also sharded by `user_id` (so a user's orders are on the same shard as their profile). But then product catalog data is sharded by `product_id`. A query for "show user 42's order history with product details" now spans two different sharding schemes — the user's shard and potentially many product shards.

**Cross-shard joins are either impossible or require full scatter-gather operations** (query every shard, merge results). Many sharded databases simply don't support them.

This is why sharding fundamentally changes how you query your data. You must design your sharding key around your most frequent access patterns, accepting that other access patterns become painful.

---

## Hotspots: When Sharding Isn't Even

Even with good sharding strategies, hotspots happen.

A "celebrity problem": if you shard a social network by user_id, and a celebrity with 50 million followers posts something, every request for that post goes to the same shard. The celebrity's shard becomes overwhelmed while others sit idle.

Solutions:
- **Shard by content, not user**: Post data might be sharded by a hash of the post_id, spreading reads across all shards regardless of the poster's popularity
- **Add read replicas for hot shards**: The hot shard gets extra replicas to handle reads
- **Cache the hot data**: Put the celebrity's most recent posts in a shared cache layer that fronts all shards

The last solution — caching — is how most systems handle celebrity-scale hotspots in practice. You can't always avoid a hotspot by clever sharding, but you can add a caching layer that absorbs the read load.

---

## Picking a Sharding Key: The Most Important Decision

The sharding key (the field you hash to determine which shard a record goes to) is the most consequential design decision in a sharded system. Choose poorly and you're stuck — re-sharding a live system is extraordinarily painful.

Good sharding key properties:
- **High cardinality**: Many possible values, so data distributes evenly (don't shard by boolean fields)
- **Low correlation with access patterns**: Random-looking (IDs work better than timestamps if all users write data at the same time)
- **Aligned with query patterns**: Your most frequent queries should usually touch one shard

Common choices:
- **User ID**: Great for user-centric applications where most queries are per-user
- **Tenant ID**: Great for multi-tenant SaaS where each customer's data is isolated
- **Geographic region**: Great when you have legal data residency requirements or want to serve users from nearby shards
- **Time-based**: Good for time-series data where you mostly query recent data (but beware: all writes for the current time period go to one shard — another hotspot)

---

## The Honest Summary

Replication and sharding are the two fundamental tools for scaling databases beyond one machine. But they both introduce problems that don't exist in single-machine systems:

**Replication gives you**:
- Read scalability ✓
- Fault tolerance ✓
- Geographic distribution ✓
- ...but: replication lag, eventual consistency, complexity of leader election on failure

**Sharding gives you**:
- Write scalability ✓
- Huge data volumes ✓
- ...but: no cross-shard joins, hotspot potential, resharding pain, operational complexity

Most large-scale systems use both: sharding for write scale and data volume, replication within each shard for availability and read scale.

In the next lesson, we'll go even deeper on what "consistency" actually means — why it's not binary, why the famous CAP theorem is commonly misunderstood, and what the actual trade-off space looks like when you're choosing between strong and eventual consistency.
