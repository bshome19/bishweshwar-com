---
id: databases-indexes-b-trees-and-lsm-trees
title: "Database Internals: B-Trees vs LSM-Trees, Indexes, and Query Plans"
track: databases
module: storage-engines
level: intermediate
duration: 35
prerequisites: [foundations-computer-architecture-primitives]
concepts: [b-tree, lsm-tree, sstable, memtable, wal, bloom-filters, indexes, query-planning]
tags: [databases, internals, indexes, storage-engines, postgres, rocksdb]
order: 1
---

# Database Internals: B-Trees vs LSM-Trees

At the lowest level, all databases perform two primary functions:
1. When you give it data, it stores the data durably on non-volatile media.
2. When you ask for data later, it retrieves the data quickly.

The storage engine architecture dictates whether a database excels at high-concurrency point lookups (PostgreSQL, MySQL InnoDB) or high-throughput write streams (RocksDB, Apache Cassandra, ScyllaDB).

---

## 1. B+ Trees: The Gold Standard for Read-Heavy Relational Databases

B+ Trees have dominated relational databases for over 40 years. They are balanced, self-reorganizing search trees optimized for block-based storage (disk pages, typically 4KB, 8KB, or 16KB).

```
                      [ Root Page: 20 | 50 ]
                     /          │           \
           ┌────────┘           │            └────────┐
           ▼                    ▼                     ▼
     [ Page: 5 | 12 ]    [ Page: 28 | 41 ]     [ Page: 63 | 85 ]
       /     │              /      │              /      │
      ▼      ▼             ▼       ▼             ▼       ▼
    Leaf   Leaf          Leaf    Leaf          Leaf    Leaf  ◄──► (Doubly Linked)
```

### Core Characteristics
- **Fan-Out**: Each node can hold hundreds or thousands of child pointers. A 4-level B+ Tree can index over 100,000,000 rows with a tree depth of just 3 or 4.
- **Predictable Point Lookups**: Reading any record requires at most 3 or 4 disk page fetches: $O(\log N)$ time complexity.
- **Efficient Range Scans**: Leaf nodes contain sequential row pointers connected by a doubly linked list. Executing `WHERE age BETWEEN 25 AND 35` requires finding the first leaf node and walking sequentially forward along the linked list.

### The Problem: Write Amplification and In-Place Overwrites
- When a row is inserted, updated, or deleted, the B-Tree modifies the corresponding page **in-place**.
- If a page is full, it must split into two pages, triggering cascading writes up the parent tree.
- Updating a single 50-byte record causes the database to rewrite the entire 16KB page to disk, plus write to the Write-Ahead Log (WAL). This random-write overhead becomes a severe bottleneck under heavy write loads.

---

## 2. LSM-Trees (Log-Structured Merge-Trees): Built for Write Throughput

Used by modern write-optimized databases (RocksDB, Cassandra, ClickHouse, Google Bigtable), Log-Structured Merge-Trees replace random in-place updates with **strictly sequential append-only writes**.

```
Client Write (INSERT/UPDATE/DELETE)
      │
      ├──► 1. Append sequentially to Write-Ahead Log (WAL on Disk) [Crash Recovery]
      │
      └──► 2. Insert into MemTable (In-Memory Sorted Skip-List / Red-Black Tree)
                 │
                 ▼ (When MemTable reaches 64MB limit)
           Flush to Disk as Immutable Sorted String Table (SSTable: Level 0)
                 │
                 ▼ (Background Merging & Compaction)
           Level 1 SSTables ──► Level 2 SSTables ──► Level 3 SSTables
```

### The Three Core Components of an LSM-Tree
1. **MemTable**: An in-memory sorted data structure (such as a Concurrent SkipList). All writes and updates are absorbed here in RAM instantaneously.
2. **Write-Ahead Log (WAL)**: An append-only log on disk. If the server loses power, the MemTable in RAM is restored by replaying the sequential WAL log.
3. **SSTables (Sorted String Tables)**: Immutable, sorted disk files. Once written to disk, an SSTable is **never modified**.
4. **Compaction**: A background process that periodically reads multiple overlapping SSTables, merges them (using merge sort), discards superseded updates or deleted records (marked by *tombstones*), and writes out clean, consolidated new SSTables.

### The Read Problem and Bloom Filters
Because a key could exist in the MemTable or across any of dozens of SSTables on disk, looking up a non-existent key could require checking every single SSTable file—incurring terrible read latency.

**The Solution**: **Bloom Filters**.
- Each SSTable maintains an in-memory Bloom filter (a space-efficient probabilistic bit array).
- The Bloom filter answers with 100% certainty if a key is **definitely NOT present** in that SSTable.
- The storage engine bypasses 99% of SSTable disk reads, checking only the exact SSTable containing the requested key.

---

## 3. Storage Engine Comparison Matrix

| Dimension | B+ Tree (MySQL, PostgreSQL) | LSM-Tree (RocksDB, Cassandra) |
| :--- | :--- | :--- |
| **Write Performance** | Slower (Random I/O, page splits) | Blazing Fast (Sequential memory & append log) |
| **Read Performance** | Fast & Deterministic ($O(\log N)$) | Slower (May check multiple levels + Bloom filters) |
| **Range Queries** | Instant (Linked leaf pages) | Requires multi-way merge across active SSTables |
| **Space Utilization** | Fragmented due to page splits | Highly compressed, no internal fragmentation |
| **Primary Workload** | OLTP, Read-heavy, complex transactions | High-ingest time-series, analytics logs, key-value |
