---
id: foundations-computer-architecture-primitives
title: "Computer Architecture Primitives: Memory, Threads, and I/O Models"
track: foundations
module: mental-model
level: beginner
duration: 25
prerequisites: [foundations-latency-throughput]
concepts: [threads, processes, async-io, epoll, memory-hierarchy, context-switching]
tags: [foundations, os, concurrency, io]
order: 3
---

# Computer Architecture Primitives for Distributed Systems

Distributed systems are simply collections of individual computers connected by imperfect network cables. To reason effectively about high-scale services, an engineer must first understand what happens inside a single node: how memory is addressed, how operating system threads execute, and how network sockets process bytes.

---

## 1. Process vs Thread vs Coroutine / Fiber

Operating systems manage concurrency across multiple levels of abstraction:

```
Process (Isolated Virtual Memory, File Descriptors, PID)
   │
   ├── Thread (Shared Memory Space, Separate Registers & Call Stack)
   │      │
   │      ├── Coroutine / Fiber (User-space scheduled, tiny 2-4KB stack)
```

### Processes
- **Isolation**: Each process possesses its own private virtual address space managed by the OS page table and MMU (Memory Management Unit). If one process crashes (e.g. segmentation fault), other processes remain unaffected.
- **Inter-Process Communication (IPC)**: Sharing data between processes requires explicit mechanisms: Unix domain sockets, pipes, shared memory (`shmget`/`mmap`), or network loops.
- **Context Switch Overhead**: Switching between processes requires invalidating CPU translation lookaside buffers (TLB) and swapping memory registers, taking $1\text{ to }5\text{ microseconds}$.

### Operating System Threads (Kernel Threads)
- **Shared Memory**: All threads within a process share the same heap, global variables, and open file descriptors. This enables extremely fast data sharing.
- **Race Conditions**: Because memory is shared, uncoordinated concurrent writes lead to memory corruption and undefined behavior, requiring synchronization primitives (Mutexes, Read-Write Locks, Semaphores, Atomic CAS).
- **Cost**: A typical OS thread allocates $1\text{ to }8\text{ MB}$ of memory for its execution stack. Running 50,000 OS threads simultaneously will exhaust system RAM and cause the OS kernel scheduler to spend 90% of its CPU time on context switching rather than executing business logic.

### Coroutines / Virtual Threads / Green Threads (e.g., Go Goroutines, Java Loom)
- **User-Space Scheduling**: Instead of delegating context switches to the OS kernel, the application runtime (e.g., the Go M:N scheduler) multiplexes thousands of lightweight green threads across a small pool of physical OS worker threads.
- **Minimal Footprint**: Goroutines start with a minimal stack of only $2\text{ KB}$ that grows dynamically, allowing a single server to handle 1,000,000 concurrent connections effortlessly.

---

## 2. The Evolution of I/O Models: From Blocking to epoll

How does a web server listen for incoming HTTP requests on a network socket?

### 1. Synchronous Blocking I/O (`1 Thread Per Connection`)
```
Accept Client Socket ──► Spawn OS Thread ──► Block on read() ──► Write Response ──► Close
```
- In the early days of the web (Apache MPM Worker), each socket connection occupied an entire OS thread.
- If a client connected and stayed idle for 30 seconds (HTTP Keep-Alive), that thread remained blocked in the kernel doing zero work while holding 4MB of RAM.
- **The C10K Problem**: A single machine could not sustain 10,000 concurrent open connections due to thread memory exhaustion.

### 2. Non-Blocking Event-Driven I/O (`epoll` / `kqueue` / `io_uring`)
```
Single Event Loop Thread (Linux epoll_wait)
       │
       ├── Socket #4 ready for read ──► Read data buffer (non-blocking)
       ├── Socket #9 ready for write ──► Flush outgoing packet
       └── Socket #142 closed ──► De-register file descriptor
```
- Modern high-performance servers (Nginx, Node.js, Envoy, Netty, Redis) register thousands of file descriptors with the Linux kernel using `epoll`.
- The single thread sleeps until the OS network card notifies it that packets have arrived.
- One CPU core can comfortably drive hundreds of thousands of active socket connections with minimal memory overhead.

---

## 3. Storage Hierarchy: Why Sequential Access Dominates Random Access

Modern storage engines (MySQL InnoDB, RocksDB, Kafka, Cassandra) are shaped entirely by the mechanical and electrical characteristics of storage media.

```
Fastest, Most Expensive
┌─────────────────────────────────┐
│ CPU Registers (< 1 ns)          │
├─────────────────────────────────┤
│ L1 / L2 / L3 Caches (1 - 20 ns) │
├─────────────────────────────────┤
│ Main RAM (100 ns)               │
├─────────────────────────────────┤
│ NVMe / PCIe SSD (50 - 150 µs)   │
├─────────────────────────────────┤
│ Mechanical HDD (5 - 15 ms)      │
└─────────────────────────────────┘
Slowest, Lowest Cost
```

### The Power of Sequential I/O
- Random read operations on persistent storage require searching indexes or moving physical disk heads.
- Sequential writes—appending new bytes to the very end of an append-only file—bypass random seek penalties entirely.
- In benchmarks, sequential disk writes can achieve throughput of $600\text{ MB/s}$ to $3\text{ GB/s}$, matching or exceeding random memory writes!
- This single physical primitive explains why systems like **Apache Kafka** (append-only commit log) and **LSM-tree databases** (SSTables written sequentially to disk) can sustain millions of writes per second where traditional random-write B-tree databases stall.
