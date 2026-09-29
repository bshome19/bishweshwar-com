---
id: machine-coding-cache
title: "Building an In-Memory Cache with LRU and TTL"
track: machine-coding
module: data-structures
level: advanced
duration: 30
prerequisites: [caching-topologies-eviction]
concepts: [lru-cache, ttl, doubly-linked-list, hash-map, thread-safety, eviction]
tags: [advanced, machine-coding, cache, lru, ttl, data-structures]
interactive:
  type: code-playground
  enabled: true
order: 3
---

# Building an In-Memory Cache with LRU and TTL

In the caching track, we discussed LRU eviction and TTL expiration conceptually. Now we'll build one from scratch, discovering why the data structure choices matter.

---

## The Requirements

Build a cache that supports:
- `get(key)` → returns value or null, in O(1) time
- `set(key, value, ttl_seconds)` → stores with optional expiration, in O(1) time
- Fixed maximum capacity with LRU eviction
- Thread-safe for concurrent access

---

## Why You Need Two Data Structures

A hash map gives you O(1) lookup by key. But LRU eviction requires knowing which key was accessed *least recently* — the ordering of all keys by access time.

A linked list maintains order: the most recently accessed item at the head, the least recently accessed at the tail. Evict from the tail.

But a linked list is O(n) to find a specific node.

**The solution**: Use *both*. A hash map for O(1) key lookup, pointing to nodes in a doubly-linked list that maintains access order.

```python
import time
from threading import Lock
from typing import Optional, Any

class Node:
    def __init__(self, key: str, value: Any, expires_at: Optional[float] = None):
        self.key = key
        self.value = value
        self.expires_at = expires_at
        self.prev: Optional['Node'] = None
        self.next: Optional['Node'] = None
    
    @property
    def is_expired(self) -> bool:
        return self.expires_at is not None and time.time() > self.expires_at

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache: dict[str, Node] = {}
        self.lock = Lock()
        
        # Sentinel nodes simplify edge cases
        self.head = Node("", None)  # Most recently used
        self.tail = Node("", None)  # Least recently used
        self.head.next = self.tail
        self.tail.prev = self.head
    
    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            node = self.cache.get(key)
            if node is None:
                return None
            
            if node.is_expired:
                self._remove_node(node)
                del self.cache[key]
                return None
            
            # Move to head (most recently used)
            self._remove_node(node)
            self._add_to_head(node)
            return node.value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        with self.lock:
            expires_at = time.time() + ttl_seconds if ttl_seconds else None
            
            if key in self.cache:
                # Update existing
                node = self.cache[key]
                node.value = value
                node.expires_at = expires_at
                self._remove_node(node)
                self._add_to_head(node)
            else:
                # Insert new
                if len(self.cache) >= self.capacity:
                    self._evict_lru()
                
                node = Node(key, value, expires_at)
                self.cache[key] = node
                self._add_to_head(node)
    
    def _add_to_head(self, node: Node):
        node.prev = self.head
        node.next = self.head.next
        self.head.next.prev = node
        self.head.next = node
    
    def _remove_node(self, node: Node):
        node.prev.next = node.next
        node.next.prev = node.prev
    
    def _evict_lru(self):
        """Remove the least recently used (non-sentinel tail) node."""
        lru = self.tail.prev
        if lru == self.head:
            return  # Cache is empty
        self._remove_node(lru)
        del self.cache[lru.key]
```

---

## The Key Insight: Sentinel Nodes

The `head` and `tail` sentinel nodes eliminate edge-case handling. Without sentinels, adding to an empty list and removing the last element require special cases. With sentinels, the list always has at least two nodes, and every real node always has valid `prev` and `next` pointers.

This is a standard technique in linked list implementations, and it makes the code dramatically cleaner.

---

## TTL: Lazy vs Active Expiration

Our implementation uses **lazy expiration**: expired entries are removed when accessed. This is simple but means expired entries consume memory until someone tries to read them.

**Active expiration** runs a background thread that periodically scans for and removes expired entries. Redis uses a hybrid: lazy expiration on access, plus a background thread that randomly samples keys and removes expired ones.

For our in-memory cache, lazy expiration is sufficient. The trade-off (some expired entries lingering in memory) is acceptable for the simplicity gain.

---

## Testing and Usage

```python
cache = LRUCache(capacity=3)

cache.set("a", 1)
cache.set("b", 2)
cache.set("c", 3)

assert cache.get("a") == 1  # Moves "a" to head

cache.set("d", 4)  # Capacity full → evicts "b" (LRU after "a" was accessed)
assert cache.get("b") is None  # Evicted

cache.set("e", 5, ttl_seconds=1)
time.sleep(2)
assert cache.get("e") is None  # Expired
```

This exercise demonstrates that understanding data structures deeply — why O(1) operations require specific structural choices — is essential for building performant system components.
