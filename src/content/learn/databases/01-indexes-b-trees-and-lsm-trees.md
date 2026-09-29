---
id: databases-indexes-btrees-lsm
title: "Why Databases Have Indexes (And What They Actually Are)"
track: databases
module: storage-internals
level: intermediate
duration: 25
prerequisites: [foundations-computer-architecture]
concepts: [indexes, b-tree, lsm-tree, wal, sstable, bloom-filter, write-amplification]
tags: [intermediate, databases, indexes, b-tree, lsm-tree, storage]
interactive:
  type: btree-visualizer
  enabled: true
order: 1
---

# Why Databases Have Indexes (And What They Actually Are)

Here's a question: how does your database find a row?

Not "how do indexes help" — that comes later. I mean literally, physically, what does the database do when you run this query:

```sql
SELECT * FROM users WHERE email = 'alice@example.com';
```

Without any index on the `email` column, your database has no map, no shortcut, no structure that tells it where Alice's row is. It only knows where the *table* starts. So it does the only thing it can:

**It reads every row. One by one. Until it finds Alice — or runs out of rows.**

This is called a **full table scan**. For a table with 100 rows, it's instant. For a table with 10 million rows, it might take seconds. For a table with a billion rows, it might never finish before the query times out.

So the database needs something better. And figuring out what "better" looks like — from first principles — is actually the story of how B-Trees were invented.

---

## Attempt 1: Keep the Table Sorted

"If the database read every row in order," you might think, "couldn't I keep the table sorted by email? Then I could binary search — check the middle, go left or right, halve the space each time. A billion rows, only 30 checks."

Yes! That's already much better. Binary search on a sorted list is O(log n) instead of O(n). For a billion rows: 1 billion reads becomes ~30 reads. That's a billion times better.

But there's a problem. A table is a physical file on disk. If you sort it by `email`, you've fixed the order of the rows. Now run this query:

```sql
SELECT * FROM users WHERE user_id = 42;
```

The rows are sorted by email. `user_id = 42` could be anywhere. You're back to scanning everything.

And this isn't a theoretical problem. Real tables are queried by many different columns: by `user_id`, by `email`, by `created_at`, by `status`. You can't sort the table by all of them at once — there's only one physical order.

**Core insight**: You can't sort the main table to suit every query, because the table can only have one physical order.

---

## Attempt 2: Separate the Lookup Structure from the Data

What if you don't sort the main table? What if, instead, you build a *separate structure* — a map that says "email X is in row location Y"?

The main table stays in insertion order (whatever order rows were added). The separate structure — the **index** — is sorted by email and maps each email to a "pointer" (the location of that row in the main table).

Now a query by email:
1. Binary search the index (sorted, fast)
2. Get the row location
3. Jump directly to that row in the main table

And a query by `user_id`? Build another index on `user_id`. You can have many indexes on the same table, each sorted by a different column.

This solves the original problem. But now a new question: **what data structure should the index be?**

---

## The Data Structure Problem

The index needs to support:
1. **Point lookups**: Find the row with email = 'alice@example.com'
2. **Range queries**: Find all users with emails starting with 'a' (WHERE email >= 'a' AND email < 'b')
3. **Fast inserts and deletes**: When you add or remove a user, the index must be updated

What data structure handles all three?

**A sorted array?** Fast binary search ✓, range queries ✓. But inserting in the middle of a sorted array requires shifting all subsequent elements. For a million-row index, inserting early alphabetically means moving millions of elements. This is O(n) — terrible.

**A hash table?** O(1) point lookups ✓, fast inserts ✓. But hash tables don't preserve order. Range queries are impossible — you'd have to check every entry. Useless for anything other than exact-match lookups.

**A balanced binary search tree (BST)?** O(log n) lookups, insertions, deletions ✓. Range queries work by in-order traversal ✓. But... there's a disk problem.

Each node in a binary tree holds one key and two child pointers. To search a tree with a million keys, you'd need about 20 node accesses (log₂(1,000,000) ≈ 20). Each node access is potentially a disk read. 20 disk reads per query, at 10ms per disk read... that's 200ms just for one lookup.

This is disastrous for a disk-based database. We need something much more cache-friendly.

---

## The B-Tree: Designed for Disk

The B-Tree (invented by Rudolf Bayer and Ed McCreight at Boeing in 1970) solves the disk problem with one elegant insight:

**Instead of storing one key per node, store *many* keys per node.**

A typical B-Tree node holds 100-1000 keys (depending on key size and the configured "page size"). Each node exactly fills one disk page (typically 4KB or 16KB). Reading a node = one disk I/O.

Here's why this matters:

```
Binary Search Tree (1 key per node):
Depth for 1M keys = log₂(1,000,000) ≈ 20 levels
= 20 disk reads per lookup

B-Tree (1000 keys per node):
Depth for 1M keys = log₁₀₀₀(1,000,000) = 2 levels
= 2-3 disk reads per lookup
```

That's the magic. By making each node hold 1000 keys instead of 1, the tree gets much *wider* and much *shallower*. A three-level B-Tree can hold **a billion keys** with only 3 disk reads per lookup.

And because each node fills exactly one disk page, the OS and CPU can cache entire nodes in the buffer pool. Hot nodes (like the root and first level) stay permanently in memory. Most lookups in a busy database never touch disk at all.

### How B-Tree Lookups Work

Suppose we have this (simplified) B-Tree indexing emails:

```
              [davis, johnson, smith]
             /          |            \
  [adams, brown]  [garcia, harris]  [taylor, wilson]
```

To find 'garcia@example.com':
1. Start at root: `davis < garcia < johnson`, so go to the middle child
2. Middle child: `garcia` is here! Return the row pointer.

That's 2 node reads. In a real database with millions of rows, it's 3-4.

### Insertions and the Self-Balancing Property

What happens when you insert a new email that goes in a node that's already full?

The B-Tree **splits** the node: it takes the middle key, moves it up to the parent, and creates two new nodes. If the parent overflows, it splits too. This propagates up the tree, maintaining the property that all leaves are at the same depth (the tree stays "balanced").

This is why B-Trees have consistently good performance even as data grows — they reorganize themselves automatically.

---

## Why PostgreSQL and MySQL Use B+ Trees (Not B-Trees)

Real databases almost universally use a variant called the **B+ Tree**, with one crucial difference:

In a B-Tree, any node can store data (row pointers). In a B+ Tree:
- **Internal nodes** store only keys — they act as a routing directory
- **Leaf nodes** store the actual data pointers
- **All leaf nodes are linked in a sorted linked list**

Why does this matter? The linked list of leaves makes **range queries incredibly fast**.

```sql
SELECT * FROM users WHERE email >= 'a' AND email < 'b';
```

In a B-Tree, you'd need to traverse the entire tree to find all matching keys — they could be in any node. In a B+ Tree, you do one lookup to find the starting leaf, then **follow the leaf pointers** in order until you've collected all matches. No tree traversal for the scan phase.

This is also why indexes on primary keys in databases like MySQL (InnoDB) are called "clustered indexes" — the entire row data lives in the leaf nodes of the B+ Tree on the primary key. Secondary indexes (on other columns) store the primary key values as pointers to the main structure.

---

## The Problem B-Trees Don't Solve: Write Performance

B-Trees are excellent for read-heavy workloads. But they have a painful weakness: **writes**.

Every insert, update, or delete requires:
1. Finding the right position in the tree (multiple disk reads)
2. Writing the modified page back to disk
3. Possibly splitting nodes and writing their parents too

Worse: **random writes** to disk are slow. Updating a node in the middle of a B-Tree means writing to some arbitrary disk location — wherever that node's page lives. On an HDD, random writes require seeking the read head, which takes ~10ms each. Even on SSDs, random writes wear out the cells faster than sequential writes.

For write-heavy workloads — logging systems, time-series databases, event stores — B-Trees are the wrong tool.

---

## LSM-Trees: Turning Random Writes into Sequential Writes

The **Log-Structured Merge-Tree** (LSM-Tree) takes a completely different approach, based on one key insight:

**Sequential writes are much faster than random writes. What if we *only ever write sequentially*, and sort things out later?**

Here's how an LSM-Tree works:

**Step 1: Write everything to an in-memory buffer (memtable)**

When you insert a row, it goes into a sorted in-memory data structure called a **memtable**. This is instant — RAM writes are nanoseconds.

**Step 2: When the memtable fills, flush it to disk as an SSTable**

An **SSTable** (Sorted String Table) is an immutable, sorted file on disk. Once written, it's never modified. Writing it is one large sequential write — fast.

**Step 3: Reads check the memtable, then the SSTables in order**

When you read, check the memtable first (most recent). Then check SSTables from newest to oldest, stopping when you find the key.

**Step 4: Periodically merge and compact SSTables**

As you accumulate SSTables, reading becomes slower (you might need to check many files). A background process **compacts** them: merging sorted files by reading them sequentially and writing a new merged file. Old files are deleted.

```
Write path:
User writes → Memtable (RAM) → WAL (disk, sequential) → SSTable (disk, sequential)

Read path:
User reads → Check Memtable → Check SSTable₁ → Check SSTable₂ → ...
             [newest]          [older]           [oldest]
```

### The Trade-offs

LSM-Trees win at writes:
- No random disk writes during normal operation
- Writing to the WAL (Write-Ahead Log) and flushing SSTables are both sequential
- Great for write-heavy workloads: Cassandra, RocksDB, LevelDB all use LSM-Trees

LSM-Trees lose at reads:
- Finding a key might require checking many SSTables
- **Bloom filters** (a probabilistic data structure) help — they can tell you with near-certainty that a key is *not* in a given SSTable, allowing you to skip it without reading it
- But reads are still generally slower than B-Trees for point lookups

And LSM-Trees have **write amplification**: every byte written by the user is eventually written to disk multiple times — once to the WAL, once to the first SSTable, once during each compaction. This wears SSDs faster.

---

## What Actually Happens During a Database Write

Now you know enough to trace a real database write, from your code to disk.

You run: `INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice')`.

**In PostgreSQL (B-Tree based):**
1. Database receives the query
2. **WAL first**: Before anything else, write the change to the Write-Ahead Log — a sequential append to a log file. This is what makes writes *durable*. If the machine crashes after this step, the WAL can replay the write.
3. **In-memory modification**: The relevant B-Tree page is modified in the database's **buffer pool** (its in-memory cache of disk pages)
4. **Background flush**: Eventually, the modified pages are written back to disk. This is *not* synchronous with your INSERT statement — the WAL ensures durability, so the actual data file write can be deferred.
5. **Index updates**: Every index on this table also needs an update. Each index is a separate B-Tree. Each might require its own WAL entry and page modifications.

This is why indexes have a cost on writes. Adding 5 indexes to a table means a single INSERT modifies 6 B-Tree structures (1 table + 5 indexes). The more indexes, the slower your writes.

---

## Choosing the Right Tool

The B-Tree vs LSM-Tree choice is a microcosm of all system design decisions: **trade-offs, not solutions**.

Use a **B-Tree based database** (PostgreSQL, MySQL, SQLite) when:
- Your workload has more reads than writes
- You need range queries
- Point lookup performance is critical
- You want a mature, battle-tested default

Use an **LSM-Tree based database** (Cassandra, RocksDB, ScyllaDB) when:
- Your workload is write-heavy (logging, events, time-series)
- You can tolerate slightly slower reads
- You're writing mostly in time order (newest data is hottest)

There's no universally correct answer. The right answer depends on your access patterns.

---

## The Deeper Lesson

The reason B-Trees and LSM-Trees both exist isn't because engineers couldn't agree on one. It's because **they optimize for genuinely different things** — and different workloads need different optimizations.

B-Trees are optimized for random reads (lookup any key quickly). LSM-Trees are optimized for sequential writes (write as fast as possible, sort things out later).

Understanding *why* each structure exists — what problem it was designed to solve and what it sacrifices to solve it — is the skill that lets you reason about any new data structure you encounter. Ask: what is this optimized for? What does it sacrifice? Does my workload match the optimization?

In the next lesson, we'll look at what happens when your data grows beyond what one database can handle — and how sharding and replication introduce a whole new class of problems.
