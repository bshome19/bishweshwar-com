---
id: networking-transport-protocols-tcp-udp
title: "Transport Protocols: TCP Three-Way Handshake, Flow Control, and UDP Trade-Offs"
track: networking
module: transport
level: beginner
duration: 25
prerequisites: [foundations-latency-throughput]
concepts: [tcp, udp, handshake, flow-control, congestion-control, head-of-line-blocking, quic]
tags: [networking, protocols, tcp, udp, transport]
order: 1
---

# Transport Protocols: TCP, UDP, and the QUIC Revolution

Every byte of data sent over the public internet or between microservices in an enterprise cluster relies on the Transport Layer (Layer 4 of the OSI model). Choosing between TCP, UDP, or modern QUIC/HTTP/3 dictates whether your service guarantees strict in-order delivery or optimizes for raw real-time speed.

---

## 1. Transmission Control Protocol (TCP): Reliable, In-Order Stream

TCP is a connection-oriented, stateful byte-stream protocol designed for environments where data loss or corruption is completely intolerable (financial ledgers, REST APIs, database queries, SSH sessions).

### The Three-Way Handshake

Before any application payload (like an HTTP GET request) can be transmitted, client and server must negotiate sequence numbers and buffer sizes:

```
Client                                     Server
  │                                           │
  │────────── 1. SYN (seq=x) ────────────────►│ (SYN_RCVD)
  │                                           │
  │◄───────── 2. SYN-ACK (seq=y, ack=x+1) ───│
  │                                           │
  │────────── 3. ACK (ack=y+1) ──────────────►│ (ESTABLISHED)
  │                                           │
  │==== Connection Established: Ready for Data ====│
```

- **Cost**: The handshake requires **1 full Round-Trip Time (1 RTT)** before a single byte of application data travels. If network RTT is $50\text{ms}$, your request has already taken $50\text{ms}$ before your backend code even runs!
- When paired with legacy TLS 1.2 encryption, handshakes took up to **3 RTTs** ($150\text{ms}$) just to negotiate the connection.

### TCP Reliability Guarantees
1. **Sequence Numbering & In-Order Delivery**: If packets arrive out of order at the operating system network stack, TCP buffers them until missing packets arrive. The application never observes disordered bytes.
2. **Flow Control (Sliding Window)**: Prevents a fast sender from overwhelming a slow receiver's memory buffer. The receiver advertises its available `Window Size` in every TCP header.
3. **Congestion Control (AIMD: Additive Increase / Multiplicative Decrease)**: Prevents the global internet switches and routers from collapsing under traffic. Algorithms like Cubic, Reno, and Google BBR probe network capacity, slowly ramping up transmission rates until packet drop is detected, whereupon transmission rate is halved immediately.

### The Fatal Flaw: Head-of-Line (HoL) Blocking
Because TCP guarantees strict byte-order delivery:
- If packet #2 of 100 is lost in transit, packets #3 through #100 are held in kernel memory.
- The operating system will **not** release the remaining data to the application until packet #2 is retransmitted and acknowledged.
- In HTTP/2, where hundreds of parallel API requests are multiplexed over a single shared TCP socket, a single dropped packet stalls **all concurrent streams simultaneously**.

---

## 2. User Datagram Protocol (UDP): Connectionless & Lightweight

UDP is a stateless, packet-oriented protocol. It does not establish connections, does not track sequence numbers, and does not guarantee delivery or packet order.

```
Client ──[ UDP Datagram 1 ]──► Server
Client ──[ UDP Datagram 2 ]──► (Dropped by router)
Client ──[ UDP Datagram 3 ]──► Server (Received before Datagram 1)
```

### Why Choose UDP?
1. **Zero Connection Overhead (0 RTT)**: The sender immediately sends the packet without waiting for handshake confirmations.
2. **Minimal Header Size**: A standard TCP header is $20\text{ to }60\text{ bytes}$; a UDP header is only $8\text{ bytes}$, reducing network bandwidth waste.
3. **No Head-of-Line Blocking**: If a datagram is dropped, subsequent datagrams are delivered directly to the application without stalling.
4. **Ideal Use Cases**:
   - **DNS Queries**: Lightweight request-reply pairs where a lost query can simply be re-sent after a short timeout.
   - **Real-Time Audio / Video (WebRTC, VoIP)**: A human ear will not notice a missing $20\text{ms}$ audio frame, but will notice an audio freeze caused by TCP retransmission delays.
   - **Multiplayer Gaming**: Player position updates at 60 FPS. Past coordinates are useless once a newer position update is available.

---

## 3. The 2026 Modern Standard: QUIC and HTTP/3

To solve TCP's fundamental Head-of-Line blocking and handshake latency issues without giving up encryption and reliability, the internet engineering community built **QUIC** (standardized in RFC 9000).

```
Traditional Stack                  Modern QUIC Stack
┌────────────────────────┐         ┌────────────────────────┐
│ HTTP/2                 │         │ HTTP/3                 │
├────────────────────────┤         ├────────────────────────┤
│ TLS 1.2 / 1.3          │         │ QUIC                   │
├────────────────────────┤         │ (Encryption + Streams) │
│ TCP                    │         ├────────────────────────┤
├────────────────────────┤         │ UDP (Kernel Layer)     │
│ IP                     │         ├────────────────────────┤
└────────────────────────┘         │ IP                     │
                                   └────────────────────────┘
```

### Key Advantages of QUIC
- **Built on UDP**: Runs in user space over UDP, bypassing ossified legacy internet routers that block non-TCP/UDP packets.
- **Combined 0-RTT / 1-RTT Handshake**: QUIC merges transport connection setup and TLS 1.3 cryptographic key negotiation into a single round trip. Repeat visitors achieve **0-RTT connection resumption**.
- **Independent Streams**: Multiplexed HTTP/3 streams are completely independent. A packet drop on Stream A only pauses Stream A; Streams B, C, and D continue processing with zero interruption!
- **Connection Migration**: TCP connections are identified by the 4-tuple `(Client IP, Client Port, Server IP, Server Port)`. When a user switches from Home Wi-Fi to 5G Cellular, their IP changes and the TCP socket breaks immediately. QUIC uses a 64-bit `Connection ID`, allowing seamless uninterrupted data transfer while roaming.

---

## Comparison Matrix

| Feature | TCP | UDP | QUIC (HTTP/3) |
| :--- | :--- | :--- | :--- |
| **Connection Setup** | 1 RTT (3-way handshake) | 0 RTT (None) | 0–1 RTT (Combined TLS) |
| **Reliability** | Guaranteed (Retransmission) | None (Best-effort) | Guaranteed per-stream |
| **Packet Ordering** | Strict global stream | None (Out-of-order) | Strict per-stream |
| **Head-of-Line Blocking**| Yes (Entire connection) | No | No (Isolated per stream) |
| **Header Overhead** | 20–60 bytes | 8 bytes | Variable (~10–25 bytes) |
| **IP Roaming Support** | No (Broken socket) | Application-managed | Native Connection ID |
