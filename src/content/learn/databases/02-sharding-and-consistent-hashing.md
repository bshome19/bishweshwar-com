---
id: databases-sharding-and-consistent-hashing
title: "Database Sharding and the Mechanics of Consistent Hashing"
track: databases
module: distributed-data
level: intermediate
duration: 30
prerequisites: [databases-indexes-b-trees-and-lsm-trees]
concepts: [sharding, horizontal-partitioning, consistent-hashing, virtual-nodes, rehashing, rebalancing]
tags: [databases, distributed-systems, sharding, hashing, scale]
interactive:
  type: consistent-hashing
  enabled: true
order: 2
---

# Database Sharding and Consistent Hashing

When vertical scaling reaches its physical ceiling—a single database server maxes out its 128 CPU cores, 4TB RAM, and NVMe IOPS—horizontal partitioning (**sharding**) becomes mandatory.

---

## 1. The Naive Modulo Hashing Trap

Suppose you partition data across $N = 4$ database nodes:

$$\text{Node Index} = \text{hash}(\text{user\_id}) \pmod 4$$

If `hash("alice") = 14`, then $14 \pmod 4 = 2$ (Node 2).

### What Happens When You Add a 5th Node?
When traffic increases and you scale the cluster to $N = 5$:

$$\text{Node Index} = \text{hash}(\text{user\_id}) \pmod 5$$

Now, $14 \pmod 5 = 4$ (Node 4).

Almost **every single key** maps to a completely different server!
- In a naive modulo scheme, adding or removing a single node invalidates and forces data migration for **$\approx \frac{N-1}{N}$ (80% to 99%)** of all stored keys.
- The entire database cluster freezes while gigabytes of data are re-indexed across the network, causing a total site outage.

---

## 2. The Consistent Hashing Ring ($0$ to $2^{32}-1$)

Consistent Hashing solves the rehashing catastrophe by mapping both **database servers** and **data keys** onto the exact same circular integer hash space (typically $0$ to $2^{32}-1$).

```
                      Node A (hash = 100)
                     /                   \
                   /                       \
        Key 3 (380)                         Key 1 (180)
                │                             │
                ▼                             ▼
        Node C (hash = 300) ◄─────────── Node B (hash = 200)
                                Key 2 (240)
```

### How Key Assignment Works
1. Hash the server IP/hostname to place it at a coordinate on the ring.
2. When a data key arrives, hash the key to find its coordinate on the ring.
3. Walk **clockwise** along the perimeter until you encounter the first physical server. That server owns the key.

### The $K/n$ Rebalancing Guarantee
When a new node (Node D) is inserted between Node A and Node B:
- **Only the keys that fall between Node A and the new Node D need to move.**
- All other keys assigned to Node B and Node C remain completely untouched on their existing physical machines!
- On average, adding or removing a node requires remapping only:

$$\text{Remapped Keys} = \frac{K}{N}$$

Where $K$ is the total number of keys in the cluster and $N$ is the number of servers. If you have 4 servers and add a 5th, only $20\%$ of keys move instead of $80\%-100\%$.

---

## 3. The Skew Problem and Virtual Nodes (vnodes)

In practice, simple consistent hashing suffers from two major flaws:
1. **Non-Uniform Distribution**: Randomly hashing 4 physical servers can place three nodes close to each other, leaving one server responsible for 70% of the entire ring's keys (hot spots).
2. **Heterogeneous Hardware**: A server with 64GB RAM should process twice as much data as a server with 32GB RAM, but naive hashing treats all nodes identically.

### The Solution: Virtual Nodes (vnodes)
Instead of assigning each physical machine a single position on the ring:
- Each physical node is hashed dozens or hundreds of times using different prefixes (e.g., `ServerA#1`, `ServerA#2`, ..., `ServerA#150`).
- These virtual nodes are scattered uniformly across the entire $2^{32}-1$ perimeter.
- When physical Server A is removed, its 150 virtual tokens disappear from different locations around the ring, distributing its load evenly across all remaining servers rather than overwhelming just one adjacent neighbor.

---

## Interactive Simulation

Use the **Consistent Hashing Ring Simulator** above to:
1. Add and kill physical nodes in real time.
2. Toggle Virtual Nodes (vnodes) from 1 to 20 per server to watch ring balance standard deviation drop from 30%+ down to <5%.
3. Observe how consistent hashing redistributes only a fraction of keys during scaling events.
