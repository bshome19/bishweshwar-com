---
id: foundations-computer-architecture
title: "What's Actually Happening Inside Your Computer"
track: foundations
module: hardware-fundamentals
level: beginner
duration: 22
prerequisites: [foundations-latency-throughput]
concepts: [cpu, memory-hierarchy, cache, processes, threads, i-o, context-switching]
tags: [beginner, foundations, hardware, cpu, memory]
interactive:
  type: memory-hierarchy
  enabled: true
order: 3
---

# What's Actually Happening Inside Your Computer

When you write `const result = db.query("SELECT * FROM users WHERE id = 1")`, what actually happens?

Not the conceptual version — the *actual* version. Electrons move. Memory cells change state. A physical laser reads pits in a spinning disk. Bytes travel over copper wire. There's a real physical chain of events that produces the number you see on your screen.

Most of us don't need to care about most of this, most of the time. But when your system is slow, or consuming too much memory, or behaving strangely under load — understanding what's physically happening is the only reliable way to reason about it.

This lesson builds that physical intuition, from CPU to memory to disk to network.

---

## The CPU: A Very Fast, Very Patient Machine

A modern CPU executes roughly 3 billion operations per second. Each "operation" is something extremely simple: add two numbers, compare two values, load a byte from memory, jump to a different instruction.

But here's the thing most people don't realize: **the CPU is almost never doing useful work**. Most of the time, it's waiting.

Waiting for data from RAM. Waiting for data from disk. Waiting for a response from a network socket. The CPU is blindingly fast — but it can only go as fast as the data arrives.

This creates the central architectural challenge of software performance: **the CPU is always hungry; your job is to keep it fed**.

### What a CPU Actually Executes

Your Python or Go or Java code doesn't run directly on the CPU. It gets compiled (or JIT-compiled, or interpreted) into **machine instructions** — tiny, specific operations.

A statement like `x = a + b` might compile to:
```
LOAD R1, [address_of_a]   # Load value of 'a' into register R1
LOAD R2, [address_of_b]   # Load value of 'b' into register R2
ADD  R3, R1, R2            # Add R1 and R2, store result in R3
STORE [address_of_x], R3  # Store R3 into memory where 'x' lives
```

Registers are tiny, ultra-fast storage locations *inside the CPU itself* — there are only a few dozen of them, and each holds maybe 8 bytes. They're what the CPU can actually operate on. Everything else has to be loaded from somewhere slower.

The LOAD instruction is where the trouble starts.

---

## The Memory Hierarchy: A Pyramid of Speed and Size

This is one of the most important mental models in all of computing. Read this section twice.

The CPU can't hold much data itself (just those few dozen registers). So data lives in a hierarchy of storage systems, each faster and smaller than the one below it:

```
Fastest  ┌──────────────────────────────┐ ← CPU Registers (64 bytes, ~0.3ns)
         ├──────────────────────────────┤ ← L1 Cache (256KB, ~1ns)
         ├──────────────────────────────┤ ← L2 Cache (4MB, ~5ns)
         ├──────────────────────────────┤ ← L3 Cache (16-32MB, ~20ns)
         ├──────────────────────────────┤ ← RAM / Main Memory (16-256GB, ~100ns)
         ├──────────────────────────────┤ ← SSD (1-4TB, ~0.1ms = 100,000ns)
Slowest  └──────────────────────────────┘ ← HDD (4-16TB, ~10ms = 10,000,000ns)
```

These aren't arbitrary engineering choices. They reflect a genuine physical trade-off: **faster storage requires more transistors per bit stored, which means more cost, more heat, more power consumption, and smaller capacity**.

L1 cache is as fast as the CPU because it's literally built into the same silicon die. RAM is slower because it uses different technology (DRAM vs SRAM) that's cheaper and denser but requires periodic refreshing. Disk is slowest because mechanical spinning or even NAND flash cells can't be read as fast as volatile RAM.

### The Key Implication: Cache Misses Kill Performance

When the CPU needs a value, it checks L1 first. If it's there (a "cache hit"), great — it gets the data in ~1ns. If not (a "cache miss"), it checks L2. And so on down the hierarchy.

A cache miss all the way to RAM adds ~100ns. A cache miss to SSD adds ~100,000ns. These aren't percentages — they're **orders of magnitude**.

Here's what this means in practice: **a loop that accesses memory predictably (like iterating an array in order) is dramatically faster than one that accesses memory randomly (like following pointers in a linked list)**.

Iterating an array: the CPU prefetcher can predict you're going to need the next elements, and pre-loads them into cache before you ask. When you access them, they're already there.

Traversing a linked list: each node contains a pointer to the *next* node, which could be anywhere in memory. The CPU can't predict where it is. Every node traversal might be a cache miss all the way to RAM.

This is why **arrays often outperform linked lists in practice**, even for operations where linked lists should theoretically be faster (like insertion in the middle). The cache behavior dominates.

> **This has profound implications for databases**: Database indexes stored as B-Trees (a sorted, branching tree structure) are specifically designed to be cache-friendly. The structure fits in a small number of large "pages" that can be loaded into cache. Understanding this makes the B-Tree design decision obvious, not arbitrary.

---

## Processes and Threads: Sharing a CPU

Your computer runs many programs simultaneously — your browser, your editor, your Spotify, your terminal. But it has far fewer CPU cores (maybe 8-16) than running programs (maybe 200+).

The operating system (OS) solves this with a trick called **time-slicing**: each program gets to run for a tiny slice of time (a few milliseconds), then the CPU switches to another program. This happens so fast that everything appears to run simultaneously.

This switching is called a **context switch**, and it has a cost.

When the OS switches from one process to another, it has to:
1. Save the current state of the running process (all its registers, program counter, etc.)
2. Load the saved state of the next process
3. Flush and reload portions of the CPU cache (the new process uses different memory)

A context switch takes roughly 1-10 microseconds. That sounds tiny, but if you're doing thousands per second, it adds up. And the cache flush is the expensive part — after a context switch, your program has a "cold cache" and will encounter cache misses until it warms up again.

### Processes vs Threads

A **process** is an isolated program with its own memory space. Two processes can't read each other's memory (by default). If one crashes, it doesn't take down the other.

A **thread** is a unit of execution *within* a process. Multiple threads share the same memory space. They can read and write the same variables, which enables fast communication between threads — but also introduces the most painful class of bugs in software: **race conditions**.

```python
# This code is broken:
counter = 0

def increment():
    global counter
    temp = counter      # Thread A reads: counter is 5
                        # Thread B reads: counter is also 5!
    temp = temp + 1     # Both compute: temp = 6
    counter = temp      # Both write: counter = 6

# Two threads each increment once, but counter is 6 instead of 7.
# The second write overwrites the first.
```

This is called a **race condition** — the result depends on the unpredictable timing of thread execution. It's one of the hardest categories of bugs to find and fix because it's non-deterministic (it doesn't happen every time, which makes it hard to reproduce).

The solution is **synchronization**: mechanisms that ensure only one thread at a time can modify shared state. Locks (mutexes), atomic operations, and immutable data structures are the main tools. But synchronization has costs — a thread waiting for a lock is a thread not doing useful work.

**Thread design is a central constraint in system design**: how many threads you can run, how much work each does, how much they share state, and how you coordinate them determines the performance ceiling of any multi-threaded system.

---

## What Happens When You Read a File

Let's trace a concrete I/O operation from start to finish.

You call `readFile("data.txt")`. What happens?

1. **System call**: Your program asks the OS to read the file. This is a "system call" — a request to the kernel, which runs in privileged mode. Switching from your program (user space) to the kernel (kernel space) and back costs roughly 1-5 microseconds.

2. **File system lookup**: The kernel checks its file system to find where "data.txt" lives on disk. This involves reading the **inode** — a data structure that stores the file's metadata and the disk locations of its data blocks.

3. **Buffer cache check**: The OS maintains a cache of recently-read disk blocks in RAM (the "page cache" or "buffer cache"). If the file's blocks are already there from a recent read, the data is returned from RAM without touching the disk. This is a cache hit.

4. **Disk read (on a cache miss)**: If the blocks aren't cached, the OS must read from disk. For an HDD, this means:
   - Moving the read head to the right track (the "seek")
   - Waiting for the disk to rotate to the right position
   - Reading the magnetic pattern as the disk spins
   
   Total time: 5-15 milliseconds. This is an eternity.

5. **Copy to user space**: The data is copied from the kernel's buffer into your program's memory. Your function returns.

The important insight: **a "simple" file read involves kernel calls, cache checks, potentially mechanical disk movement, and multiple memory copies**. This is why file I/O is so much slower than in-memory operations, even on fast SSDs.

This also explains why databases put so much effort into keeping "hot" data in memory — once data is in RAM, it's 100,000x faster to access than reading it from disk again.

---

## The Network Stack: One More Layer of Complexity

When you make a network request — to a database, an API, another service — you're adding another entire stack of complexity.

Your request travels through:
1. Your code → a library (e.g., the HTTP client)
2. The library → the OS networking stack
3. The OS → your network card (NIC)
4. The NIC → the physical network (fiber, copper, WiFi)
5. Through routers, switches, possibly across continents
6. To the other machine's NIC, through its OS, to the receiving code

And then all of that in reverse for the response.

Each transition between layers has overhead. The OS network stack processes packets, maintains connection state, does checksums. The encryption/decryption for TLS adds more. Serialization (turning your objects into bytes) and deserialization (the reverse) add more.

The numbers from the previous lesson become clearer now: a "fast" in-datacenter network round-trip of 0.5ms is fast *for a network round-trip* — it's still 500 microseconds, or 500,000 nanoseconds. That's 5,000 RAM accesses. Network I/O is inherently expensive in a way that in-memory operations are not.

---

## Putting It Together: The Stack Your Request Travels

Let's trace a full web request to make this concrete.

User clicks a button in a browser. The app makes an API call to `GET /users/42`.

**On the client machine:**
- Browser's JavaScript engine executes your code (CPU, possibly L1/L2 cache for code)
- HTTP request is constructed (in RAM)
- Sent to the OS networking stack
- OS TCP/IP stack packetizes and encrypts it
- Packets sent to NIC → out to the network

**In the network:**
- Packets travel through routers (each router decision: ~microseconds)
- Physical transmission: ~0.5ms datacenter-to-datacenter

**On the server machine:**
- NIC receives packets
- OS TCP/IP stack reassembles, decrypts
- HTTP server reads the request from a socket
- Your application code runs (CPU)
- Database query: OS → network → database server → disk I/O → back
- Response constructed in RAM
- HTTP response sent back through the whole stack in reverse

All of this for one click. Usually takes 50-500ms total. When you understand the stack, you understand why.

---

## Why This Matters for System Design

Every major system design pattern exists because of some aspect of this physical reality:

| Physical Constraint | System Design Response |
|---|---|
| Disk is 100,000x slower than RAM | Caching layers, in-memory databases |
| CPUs have cache hierarchies | Data layout choices, sequential vs random access |
| Network is expensive per round-trip | Batching, connection pooling, HTTP/2 multiplexing |
| Threads sharing memory cause races | Immutability, message passing, actor models |
| Context switching has cost | Non-blocking I/O, coroutines, event loops |
| Disk seeks are slow | Log-structured storage (LSM Trees), write-ahead logs |

When you see someone recommending Redis for caching, they're exploiting the RAM vs disk gap. When you see someone recommending async I/O over threading, they're avoiding context switch overhead. When you see columnar databases for analytics, they're exploiting CPU cache locality.

The patterns aren't arbitrary — they're responses to physical reality.

In the next lesson, we'll build on this foundation and trace what actually happens when you send a packet over a network — from your application code all the way to the electrons on the wire, and why TCP exists to make unreliable hardware behave reliably.
