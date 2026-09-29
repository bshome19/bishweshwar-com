---
id: networking-tcp-udp
title: "How Data Actually Travels Across a Network"
track: networking
module: transport-protocols
level: beginner
duration: 24
prerequisites: [foundations-computer-architecture]
concepts: [tcp, udp, three-way-handshake, congestion-control, packet-loss, reliable-delivery, flow-control]
tags: [beginner, networking, tcp, udp, protocols, transport-layer]
interactive:
  type: tcp-handshake
  enabled: true
order: 1
---

# How Data Actually Travels Across a Network

Here's a scenario that seems like a miracle: you open your browser, type a URL, and within 200ms you're looking at a webpage that required data from a server 5,000km away — data that traveled through dozens of intermediate devices, potentially across undersea fiber optic cables, and arrived perfectly intact and in the correct order.

The data doesn't travel as a single stream. It gets chopped into small chunks called **packets** (usually around 1,500 bytes each). Each packet is independently routed through the network — they might take different paths, arrive in different order, or not arrive at all. The target machine then reassembles them into the original data.

And all of this just... works. How?

The answer is a protocol called **TCP** — one of the most elegant pieces of engineering in all of computing. Understanding TCP means understanding why networks behave the way they do, why certain optimizations work, and what you're actually trading when you choose UDP instead.

---

## The Problem TCP Solves

The underlying network (IP — the Internet Protocol) is fundamentally **unreliable**. It makes no guarantees:

- Packets might be **lost** (a router's queue fills up; it drops packets to relieve pressure)
- Packets might arrive **out of order** (two packets might take different paths through the network)
- Packets might be **duplicated** (some network hardware retransmits to be safe)
- Packets might be **corrupted** (radiation, electrical interference, hardware bugs)

IP handles routing — getting packets from source to destination. TCP handles everything else: reliability, ordering, flow control, and congestion control.

Think of IP as the postal system and TCP as a protocol you agree on with someone you're mailing important documents to: "I'll number each page. If you don't confirm receipt of page 7 within 30 seconds, I'll send it again. Please always acknowledge what you received."

---

## How TCP Works: Building Reliability from Unreliability

### Step 1: The Three-Way Handshake

Before any data is exchanged, TCP establishes a **connection** using a three-way handshake:

```
Client                          Server
  │                               │
  │────── SYN (seq=100) ─────────►│  "I want to connect. My sequence starts at 100."
  │                               │
  │◄───── SYN-ACK (seq=200,      │  "OK. Your 100 received. My sequence starts at 200."
  │        ack=101) ──────────────│
  │                               │
  │────── ACK (ack=201) ─────────►│  "Got it. Your 200 received. Let's talk."
  │                               │
  │         [Connected]           │
```

The **sequence numbers** (seq=100, seq=200) are how TCP tracks ordering. Every byte sent has a sequence number. The **acknowledgment number** (ack=101) tells the other side "I've received everything up to byte 100; send from 101 next."

This three-way handshake costs **one network round-trip** before any data can be sent. For a connection from New York to London (75ms round-trip), you've spent 75ms just establishing the connection. This is why connection reuse (HTTP keep-alive, connection pooling) matters so much.

### Step 2: Sliding Window — Sending Many Packets at Once

Sending one packet, waiting for an acknowledgment, then sending the next would be incredibly slow. Instead, TCP uses a **sliding window**: the sender can have many packets "in flight" simultaneously, up to the **window size**.

```
[Sent & Acknowledged] [In flight, unacknowledged] [Not yet sent]
   PKT 1  PKT 2  PKT 3 │ PKT 4  PKT 5  PKT 6 │ PKT 7  PKT 8  PKT 9
                        └─── Window = 3 ─────┘
```

As acknowledgments arrive, the window slides forward. This keeps the network pipe full — rather than waiting idle for each ack, the sender is continuously transmitting.

The window size is constrained by two things:
- **Flow control**: The receiver tells the sender its available buffer space. Don't send more than the receiver can store.
- **Congestion control**: The network between sender and receiver has limited capacity. Sending too fast causes packet loss. TCP must probe for the right rate.

### Step 3: Congestion Control — Not Flooding the Network

If every sender on the internet sent at maximum speed, routers would drop packets constantly (they'd be overwhelmed). TCP is designed to be "well-behaved" — it backs off when it detects congestion.

TCP's congestion control algorithm (in simplified form):
1. **Slow start**: Begin by sending a small amount (1-10 packets). Double the rate every round-trip until...
2. **Congestion avoidance**: You detect a packet loss (evidence of congestion). Cut your rate in half.
3. **Back to step 1** or **additive increase**: Slowly increase the rate again.

This creates a characteristic sawtooth pattern: rate grows, packet loss occurs, rate drops, rate grows, etc. The network finds its equilibrium.

The key insight: **TCP's "slow start" isn't slow in absolute terms — it's slow compared to sending everything at once**. But it means the first few round-trips of a TCP connection are always running below maximum throughput. For short-lived connections (like many HTTP/1.1 requests), the connection closes before the rate ever gets high. This is one reason HTTP/2 (which multiplexes many requests over one TCP connection) is faster — the connection has time to warm up.

---

## When Does a Packet Get Lost?

Packet loss happens when a network device's queue is full and it has no choice but to drop packets. This is called **tail-drop** and happens most commonly:

- At busy router interfaces under high load
- On congested WiFi or cellular links
- At datacenter ingress when traffic spikes

TCP handles packet loss by retransmitting: if an acknowledgment for a packet doesn't arrive within a timeout period, the sender retransmits. The timeout is based on the **RTT (Round-Trip Time)** — TCP measures the actual round-trip latency and sets its timeout accordingly.

But retransmission takes time — the full RTT to detect the loss (waiting for the ack that never comes) plus another RTT to retransmit and receive an ack. This is called **head-of-line blocking**: if packet 5 is lost, everything from packet 6 onward is held back until packet 5 is retransmitted and received, even if packets 6-100 arrived perfectly.

Head-of-line blocking is one of TCP's most significant performance limitations, and it's a core motivation for QUIC (the protocol underlying HTTP/3), which we'll cover in the next lesson.

---

## UDP: When You Don't Need All of TCP's Guarantees

**UDP** (User Datagram Protocol) is the opposite of TCP. It provides almost nothing:
- No connection establishment (no handshake)
- No acknowledgments
- No retransmission
- No ordering guarantee
- No congestion control

You send a packet. It might arrive. It might not. You'll never know unless you implement that logic yourself.

Why would anyone use this?

Because **TCP's reliability features have costs**:
- The handshake adds a round-trip latency overhead
- Retransmission adds latency when packets are lost
- Head-of-line blocking stalls fast packets behind slow ones
- Congestion control limits throughput (though this is often appropriate)

For some applications, these costs matter more than the guarantees:

**Real-time gaming**: A player's position update is stale by the time it's retransmitted. Better to skip it and send the next update. Use UDP.

**Live video streaming**: Video is continuously generated. A missed frame is better than a paused video waiting for a retransmit. Use UDP.

**DNS queries**: A tiny request expecting a tiny response. The "reliable delivery" overhead of TCP is larger than the payload. Use UDP (with retry logic if no response comes).

**VoIP**: Same as live video. A brief drop in audio is better than a pause. Use UDP.

The pattern: **UDP is appropriate when your application has its own mechanisms for handling unreliable delivery, or when unreliable delivery is explicitly acceptable**.

DNS could use TCP for reliability but the efficiency cost isn't worth it for tiny queries. Video streaming has its own buffering and quality-adaptation logic that handles packet loss better than TCP retransmission would. Gaming uses UDP with custom application-layer position reconciliation.

---

## QUIC: Fixing TCP's Problems by Throwing It Out

HTTP/3 is built on **QUIC** — a transport protocol that Google designed to address the performance limitations of TCP while keeping reliability.

QUIC's key innovations:

**1. 0-RTT Connection Establishment**

Regular TLS over TCP requires 2-3 round-trips before data can flow (TCP handshake + TLS handshake). QUIC's connection establishment is optimized: for a previously-visited server, you can send data in the *first* packet with 0 additional round-trips.

**2. Multiplexing Without Head-of-Line Blocking**

HTTP/2 over TCP can send multiple request/response pairs over one TCP connection. But if a packet in one stream is lost, TCP's ordering guarantees stall *all* streams while that packet is retransmitted. Head-of-line blocking at the TCP level blocks everything.

QUIC operates at a level above the network and can acknowledge packets per-stream. Packet loss in stream A doesn't block stream B.

**3. Connection Migration**

TCP connections are identified by (source IP, source port, destination IP, destination port). If you switch from WiFi to cellular, your IP changes, your connection is broken, and everything has to restart.

QUIC connections have a **connection ID** that persists across IP address changes. When you switch networks, the connection seamlessly migrates — no reconnect, no disruption.

---

## What This Means for System Design

Understanding TCP and UDP shapes real system design decisions:

**Connection pooling**: TCP handshakes are expensive. Keeping connections open and reusing them (connection pools for databases, HTTP keep-alive) eliminates the repeated handshake cost. A database with a fresh connection per query wastes ~2ms per query just on handshake — at 10,000 QPS, that's wasted latency everywhere.

**Load balancer layer choice**: L4 load balancers (TCP level) are fast but simple — they see TCP flows, not individual HTTP requests. L7 load balancers (HTTP level) can make smarter routing decisions (path-based routing, header inspection) but are more expensive.

**Timeout design**: TCP will retransmit silently for a long time before giving up (sometimes 90-120 seconds by default). For service-to-service calls in a microservices architecture, you need to set aggressive application-level timeouts (say, 2-5 seconds) — don't wait for TCP's timeout machinery.

**UDP in service meshes**: Some high-performance service communication (like the gRPC-over-QUIC being adopted in some envoy proxies) uses UDP under the hood for the latency benefits. This is still evolving.

In the next lesson, we'll trace what happens when you type a URL — through DNS, through TLS negotiation, to HTTP — and understand the full stack of protocols that make web communication work.
