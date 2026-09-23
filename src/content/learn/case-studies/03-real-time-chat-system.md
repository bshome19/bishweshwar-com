---
id: case-real-time-chat-system
title: "Real-World Case Study: Designing a Real-Time Chat System"
track: case-studies
module: communication-systems
level: advanced
duration: 45
prerequisites: [apis-rest-graphql-grpc-websockets, messaging-event-streaming-and-cdc]
concepts: [chat-architecture, websockets, connection-servers, presence-service, message-ordering, push-notifications]
tags: [case-study, websockets, real-time, messaging, discord, slack]
order: 3
---

# Real-World Case Study: Designing a Real-Time Chat System

Designing a real-time messaging platform (like WhatsApp, Discord, or Slack) requires solving bidirectional stateful connections, global user presence, strict message ordering, and offline push delivery.

---

## 1. Requirements & Scale Boundaries

- **User Scale**: 50,000,000 Daily Active Users (DAU).
- **Concurrent Connections**: 10,000,000 simultaneous active TCP WebSocket connections.
- **Message Latency**: Sub-100ms delivery for online 1-on-1 and group chats.
- **Delivery Guarantees**: Messages must never be lost; offline users receive messages upon reconnection.

---

## 2. Real-Time Transport: Why WebSockets Over Polling?

| Protocol | Connection Model | Overhead per Message | Suitability |
| :--- | :--- | :--- | :--- |
| **Short Polling** | Client sends HTTP GET every 1s | Massive HTTP headers (cookies, auth) | Unusable at scale |
| **Long Polling** | Server holds HTTP request until message arrives | High socket re-establishment overhead | Legacy fallback only |
| **WebSockets** | Persistent bidirectional TCP socket | Minimal (2–10 bytes framing) | **Optimal for Real-Time Chat** |

---

## 3. High-Level Architecture Topology

```
User A (Mobile)                                          User B (Desktop)
      │                                                         │
      ▼                                                         ▼
[WebSocket Gateway Server 1]                              [WebSocket Gateway Server 4]
      │                                                         │
      └───────────────────► Redis Pub/Sub Cluster ◄─────────────┘
                                   │
                                   ▼ (Async Persistence Pipeline)
                             Kafka Queue
                                   │
                                   ▼
                       Cassandra / ScyllaDB (Chat History)
```

### How Message Delivery Works:
1. User A sends a message to User B over their established WebSocket to Gateway 1.
2. Gateway 1 publishes the event to the distributed **Redis Pub/Sub** message backplane.
3. The **Presence / Routing Service** knows that User B is currently connected to Gateway 4.
4. Gateway 4 receives the event from Redis and pushes it down the existing WebSocket directly to User B's device.
5. In parallel, the message is queued to **Kafka** to be durably written to **Cassandra/ScyllaDB** for message history.

---

## 4. Message Storage Engine: Why Wide-Column (Cassandra / ScyllaDB)?

Chat message history has very specific access patterns:
- **Massive Write Volume**: Millions of new messages per second.
- **Sequential Range Reads**: Users always scroll back through recent messages for a specific conversation ID: `SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT 50`.
- **Relational databases (MySQL/PostgreSQL)** struggle because table row counts quickly exceed billions, causing B-tree index maintenance overhead.
- **Cassandra / ScyllaDB** is ideal:
  - **Partition Key**: `channel_id` (all messages for a chat live together on the same storage node).
  - **Clustering Key**: `message_id` (Snowflake / ULID containing timestamp for instant chronological range scans).
