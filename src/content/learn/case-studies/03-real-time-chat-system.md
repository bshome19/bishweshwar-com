---
id: case-study-chat-system
title: "Deep Dive: Building a Real-Time Chat System"
track: case-studies
module: real-time-chat
level: all
duration: 28
prerequisites: [apis-rest-graphql-grpc-websockets, messaging-event-streaming-cdc]
concepts: [websockets, real-time, presence, message-ordering, fan-out, delivery-receipts, offline-storage]
tags: [all, case-study, chat, real-time, websockets, messaging]
interactive:
  type: architecture-evolution
  enabled: true
order: 3
---

# Deep Dive: Building a Real-Time Chat System

A chat system seems simple: Alice sends a message, Bob receives it. But real-time chat at scale involves some of the most interesting challenges in distributed systems: message ordering, delivery guarantees, presence tracking, fan-out to group chats, and supporting offline users.

---

## Version 1: The Polling Approach

The simplest approach: the client polls the server every few seconds for new messages.

```
Client: GET /messages?since=last_seen_timestamp (every 2 seconds)
Server: Returns new messages since that timestamp
```

**Works for**: Very small scale. But at 10,000 users polling every 2 seconds, that's 5,000 requests/second — most returning empty responses. Wasteful.

---

## Version 2: WebSocket Connections

Replace polling with persistent WebSocket connections. The server pushes messages to connected clients instantly.

```
Alice's client ←WebSocket→ Chat Server ←WebSocket→ Bob's client

Alice sends: { type: "message", to: "bob", text: "Hello!" }
Server pushes to Bob: { type: "message", from: "alice", text: "Hello!" }
```

No polling. Messages arrive instantly. But: each connection is a persistent TCP connection that consumes server resources.

**Connection management**: A single server might handle 50,000-100,000 concurrent WebSocket connections (depending on memory and configuration). At 10 million concurrent users, you need 100+ chat servers.

---

## Version 3: Connection Routing

With multiple chat servers, Alice might be connected to Server 1 and Bob to Server 3. When Alice sends a message to Bob, Server 1 needs to route it to Server 3.

```
Alice → Server 1 → Message Broker (Kafka/Redis Pub-Sub) → Server 3 → Bob
```

A **connection registry** (Redis) tracks which user is connected to which server:
```
user:alice → server-1
user:bob → server-3
```

When a message arrives for Bob, the system looks up Bob's server and routes the message there.

---

## Version 4: Group Chats and Fan-Out

One-to-one chat is a routing problem. Group chat is a **fan-out** problem: one message must be delivered to all N members of the group.

For a group with 500 members:
1. Alice sends a message to the group
2. The server must deliver it to 499 other members
3. Each member might be on a different server (or offline)

**Small groups** (under 100): Fan out at write time. When a message is sent, immediately create a delivery entry for each member. Simple, works well.

**Large groups** (hundreds or thousands): Fan out at read time. Store the message once. When a member opens the group, fetch recent messages. This avoids creating millions of delivery entries for each message in a large group.

WhatsApp uses write-time fan-out (groups limited to 1024 members). Slack uses a hybrid approach.

---

## Version 5: Offline Message Delivery

Users go offline. Messages sent while they're offline must be stored and delivered when they reconnect.

```
Messages Table:
  message_id | sender | recipient | group_id | text | timestamp | delivered

Delivery Queue (per user):
  user_id | undelivered_messages[]
```

When a user reconnects:
1. Query their undelivered messages
2. Send all pending messages
3. Mark as delivered

**Ordering guarantee**: Messages must arrive in the order they were sent. Within a conversation, this means storing and delivering by timestamp or sequence number.

---

## Version 6: Presence ("Online" Indicators)

Showing who's online seems simple but is surprisingly challenging at scale.

**Heartbeat approach**: Each connected client sends a periodic heartbeat (every 30 seconds). If no heartbeat is received, the user is considered offline.

But with 10 million online users sending heartbeats every 30 seconds: 333,000 heartbeat events per second. Each heartbeat must update the presence state and potentially notify friends.

**The notification problem**: If Alice has 500 friends and goes online, 500 people need to be notified. If 10,000 users come online per second (common during peak hours), that's 5 million presence notifications per second.

**Solutions**:
- **Lazy presence**: Only check presence when a user opens a chat window, not push notifications for every status change
- **Presence channels**: Subscribe to presence updates only for users currently visible on screen
- **Batch presence updates**: Aggregate presence changes and push them periodically rather than individually

---

## Key Architecture Lessons

1. **Start with polling, evolve to WebSockets**: Don't over-engineer from the start
2. **Message routing requires a registry**: Track which server each user is connected to
3. **Fan-out strategy depends on group size**: Write-time for small groups, read-time for large groups
4. **Offline delivery is essential**: Users go offline; messages must be durable
5. **Presence at scale is its own subsystem**: The notification fan-out for presence can dwarf the messaging traffic

Each feature reveals a deeper distributed systems challenge. The simplest chat system is a weekend project. A chat system that works reliably at scale is years of engineering.
