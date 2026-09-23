---
id: mc-in-memory-cache-lru-ttl
title: "Machine Coding Case Study: Thread-Safe LRU Cache with TTL Eviction"
track: machine-coding
module: case-studies
level: advanced
duration: 45
prerequisites: [caching-topologies-and-eviction, lld-five-step-framework]
concepts: [lru-cache, doubly-linked-list, hashmap, ttl, concurrency, locks, time-complexity]
tags: [machine-coding, lld, cache, lru, data-structures, concurrency]
interactive:
  type: lru-cache
  enabled: true
order: 3
---

# Machine Coding: Thread-Safe LRU Cache with TTL Eviction

Implementing an **In-Memory Cache with Least Recently Used (LRU) eviction and Time-To-Live (TTL) expiration** is one of the most tested problems in top-tier machine coding rounds.

You must achieve:
- **$O(1)$ Time Complexity** for both `get(key)` and `put(key, value)`.
- **$O(1)$ Eviction** of the least recently used element when capacity is reached.
- **Expiration Support**: Entries automatically expire after a specified duration.
- **Thread Safety**: Concurrent access across multiple reader and writer threads without data corruption.

---

## 1. The Core Architecture: Hash Map + Doubly Linked List

Why are both data structures required?
- A standard **Hash Map** gives $O(1)$ key-value lookup, but has no inherent ordering to track recency.
- An **Array or Singly Linked List** maintains order, but finding a node to update its position takes $O(N)$ linear scan time.
- A **Doubly Linked List** paired with a **Hash Map** storing pointers directly to the list nodes enables instant $O(1)$ removal and promotion to head!

```
                  ┌───────────────────────────────────────────────┐
                  │          ConcurrentHashMap<K, Node<K,V>>      │
                  │  "A" ──► Node A                               │
                  │  "B" ──► Node B                               │
                  │  "C" ──► Node C                               │
                  └───────────────────────┬───────────────────────┘
                                          │ Direct Pointers
                                          ▼
[HEAD Sentinel] ◄──► [Node B (Newest)] ◄──► [Node A] ◄──► [Node C (Oldest)] ◄──► [TAIL Sentinel]
```

### Node Data Structure
```java
class Node<K, V> {
    K key;
    V value;
    long expiryTimestamp; // Epoch millisecond
    Node<K, V> prev;
    Node<K, V> next;

    public Node(K key, V value, long ttlMillis) {
        this.key = key;
        this.value = value;
        this.expiryTimestamp = ttlMillis > 0 ? System.currentTimeMillis() + ttlMillis : Long.MAX_VALUE;
    }

    public boolean isExpired() {
        return System.currentTimeMillis() > expiryTimestamp;
    }
}
```

---

## 2. $O(1)$ Operational Flow

### `get(key)`:
1. Lookup `node` in Hash Map. If missing, return `null`.
2. Check `node.isExpired()`. If expired, remove node from map and list, and return `null`.
3. Detach `node` from its current position in the linked list.
4. Insert `node` directly after `HEAD` (promoted to most recently used).
5. Return `node.value`.

### `put(key, value, ttl)`:
1. If `key` already exists, update value, refresh TTL, and promote node to `HEAD`.
2. If `key` is new:
   - If `cache.size() >= capacity`: Remove the node immediately preceding `TAIL` (the least recently used item) from both the linked list and the Hash Map ($O(1)$ eviction).
   - Create new `Node`, link it immediately after `HEAD`, and insert into Hash Map.

---

## 3. TTL Expiration Strategies: Passive vs Active Cleanup

How do we purge expired keys without blocking active requests?

### 1. Passive Eviction (On-Access)
Checked synchronously whenever `get(key)` or `containsKey(key)` is invoked. If the timestamp has passed, the item is deleted on the spot.
- **Limitation**: If a key is written with a 5-second TTL and never requested again, it lingers in memory indefinitely.

### 2. Active Eviction (Background Sweeper)
Run a single daemon thread with a scheduled executor (e.g. running every 1 second):
- **Redis Sampling Strategy**: Instead of scanning 1,000,000 keys (which would cause a massive CPU freeze), sample 20 random keys with TTLs. Evict all expired ones. If $>25\%$ of the sampled keys were expired, repeat the sweep immediately!

---

## Interactive LRU Visualizer

Use the **LRU Cache Playground** above to step through operations:
1. Insert keys (`A`, `B`, `C`, `D`) and watch the doubly linked list pointers update dynamically.
2. Read an older key to watch it promoted to `HEAD` in $O(1)$ time.
3. Exceed capacity to observe the exact node evicted from `TAIL`.
