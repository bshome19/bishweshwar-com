---
id: messaging-event-streaming-cdc
title: "Beyond Request-Response: Queues, Events, and CDC"
track: messaging
module: async-communication
level: intermediate
duration: 25
prerequisites: [apis-rest-graphql-grpc-websockets]
concepts: [message-queue, event-streaming, kafka, cdc, outbox-pattern, at-least-once, exactly-once, pub-sub, consumer-groups]
tags: [intermediate, messaging, kafka, event-streaming, cdc, async, queues]
interactive:
  type: kafka-partition
  enabled: true
order: 1
---

# Beyond Request-Response: Queues, Events, and CDC

Every API we've discussed so far follows the same fundamental pattern: a client sends a request, waits for a response, and then continues. This is called **synchronous communication** — "synchronous" because the caller is blocked, doing nothing, until the response arrives.

Synchronous communication has a deep problem: it couples the caller and the callee in time. Both must be running simultaneously. If the callee is down, the caller fails. If the callee is slow, the caller is slow. The caller's availability is bounded by the callee's availability.

What if the callee doesn't need to respond immediately? What if the work can be done later? What if you could decouple the caller and the callee so that neither depends on the other being available at the same time?

This is what messaging and event streaming solve.

---

## The Simple Queue: Decoupling in Time

A **message queue** is the simplest form of asynchronous communication: a buffer between a producer and a consumer.

```
Producer ──► [Queue] ──► Consumer

Producer sends a message to the queue and continues immediately.
Consumer reads messages from the queue and processes them at its own pace.
```

The queue decouples them:
- If the consumer is slow, messages accumulate in the queue. The producer isn't blocked.
- If the consumer is temporarily down, messages wait in the queue until it recovers. No messages are lost.
- If the producer sends a burst of 10,000 messages per second but the consumer can only handle 100/second, the queue absorbs the burst. The consumer processes at its own pace.

**This is the fundamental value of queues: they turn a synchronous coupling into an asynchronous one, absorbing differences in pace and availability.**

Examples: RabbitMQ, Amazon SQS, Redis queues.

### Point-to-Point vs Pub-Sub

**Point-to-point**: Each message is consumed by exactly one consumer. If you have multiple consumers, they share the work — each message goes to one of them (like a pool of workers). Good for task distribution.

**Publish-subscribe (pub-sub)**: Each message is delivered to all subscribers. When a user creates an account, the "user-created" event might go to the email service (send welcome email), the analytics service (track signup), and the billing service (create billing account). Each gets its own copy.

```
Point-to-point:         Producer → Queue → Consumer 1 (gets msg A)
                                        → Consumer 2 (gets msg B)
                                        → Consumer 3 (gets msg C)

Pub-sub:                Producer → Topic → Subscriber 1 (gets ALL)
                                        → Subscriber 2 (gets ALL)
                                        → Subscriber 3 (gets ALL)
```

Most real systems use both: pub-sub for event distribution (every interested service gets a copy), and point-to-point within each subscriber (multiple instances of the email service share the work of sending emails).

---

## Event Streaming: When Order and History Matter

Message queues are great for task distribution. But they have a fundamental limitation: **once a message is consumed, it's gone**.

What if you need:
- A new service to process all events from the last 30 days (replaying history)
- Multiple independent consumers to process the same events in their own way
- Guaranteed ordering of events (user A signed up before user B)

This is what **event streaming platforms** (primarily Apache Kafka) were designed for.

Kafka's core data structure is an **append-only log** — an ordered, immutable sequence of records.

```
Partition 0: [msg1] [msg2] [msg3] [msg4] [msg5] [msg6]
                                                  ↑
                                          write pointer
             ↑              ↑
        Consumer A     Consumer B
        (offset 0)    (offset 3)
```

Key differences from a traditional queue:

**Messages are not deleted after consumption**. They persist for a configurable retention period (days, weeks, or forever). Multiple consumers can read the same messages at different paces.

**Consumers track their own position** (offset). Consumer A might be at offset 0 (reading from the beginning). Consumer B might be at offset 3 (current, reading new messages as they arrive). A new consumer can start from the beginning and "replay" the entire history.

**Messages within a partition are strictly ordered.** If event A was written before event B, every consumer will see A before B.

### Partitions: Scaling Horizontally

A single partition is a single ordered sequence — one machine handles it. For high throughput, Kafka uses multiple **partitions** per topic.

```
Topic: "user-events"
  Partition 0: [user-1 signup] [user-1 email-change] [user-3 signup]
  Partition 1: [user-2 signup] [user-4 signup]
  Partition 2: [user-5 signup] [user-2 email-change]
```

Events are assigned to partitions by a **partition key** (typically a hash of the entity ID). All events for user-1 go to the same partition, guaranteeing ordering per user. Events for different users may go to different partitions and have no ordering guarantee relative to each other.

**Consumer groups**: A set of consumers that share the work of reading from a topic. Each partition is assigned to exactly one consumer in the group. If you have 6 partitions and 3 consumers, each consumer handles 2 partitions.

This is how Kafka scales: more partitions = more parallelism. But ordering is only guaranteed within a partition — if you need global ordering, you need a single partition (which limits throughput to what one machine can handle).

---

## Delivery Guarantees: The Three Lies

Every messaging system makes claims about delivery guarantees. Understanding what these claims actually mean — and don't mean — is critical.

**At-most-once**: The message is delivered zero or one times. It might be lost. The system does not retry. Use when losing occasional messages is acceptable (metrics, non-critical analytics).

**At-least-once**: The message is delivered one or more times. It won't be lost, but it might be delivered multiple times (duplicates). The consumer must handle duplicates gracefully (idempotently). This is the most common guarantee.

**Exactly-once**: The message is delivered exactly one time. No loss, no duplicates. **This is much harder than it sounds**, and most claims of "exactly-once" come with caveats.

The problem with exactly-once: consider what happens when a consumer processes a message and then crashes before acknowledging it. The message broker doesn't know it was processed, so it delivers it again. The consumer processes it a second time. To prevent this, you need the message processing and the acknowledgment to be atomic — either both happen or neither does. This requires distributed transactions or careful deduplication, both of which are expensive.

**Kafka's "exactly-once semantics" (EOS)** achieves this within the Kafka ecosystem by using transactions: the consumer reads from an input topic, processes, writes to an output topic, and commits the consumer offset — all in one atomic transaction. But this only works when both input and output are Kafka topics. If the consumer writes to an external database, you're back to at-least-once with application-level deduplication.

**The practical approach**: Design your consumers to be idempotent (safe to process the same message twice), use at-least-once delivery, and don't chase exactly-once semantics outside the messaging system. Deduplication at the consumer is almost always simpler than distributed transactions across systems.

---

## Change Data Capture: The Database as an Event Source

Here's a common problem: you have a database that is the source of truth, and you need other systems to react to changes in that database.

The naive approach: every time your application writes to the database, it also sends an event to Kafka.

```python
def update_user(user_id, new_email):
    db.execute("UPDATE users SET email = ? WHERE id = ?", new_email, user_id)
    kafka.send("user-events", {"type": "email-changed", "user_id": user_id, "email": new_email})
```

The problem: what if the database write succeeds but the Kafka send fails? The database has the new email, but no event was sent. Downstream systems don't know about the change.

What if the Kafka send succeeds but the database write fails? An event was sent for a change that didn't happen.

These two operations (database write + message send) are a distributed transaction across two systems. You can't make them atomic without a lot of complexity.

**Change Data Capture (CDC)** solves this elegantly: instead of your application code sending events, a CDC tool reads the database's **transaction log** (the internal log that the database uses for crash recovery) and turns each database change into an event.

```
Application → Database → [Transaction Log]
                              │
                              ▼
                         CDC Connector → Kafka Topic
                         (Debezium)
```

**Why this is better**:
1. **Your application only writes to the database.** No dual-write problem.
2. **Every database change becomes an event.** Even changes from manual SQL scripts or other tools that don't go through your application code.
3. **The events reflect what actually happened in the database**, not what your application intended to happen.
4. **It's eventually consistent but never loses events.** The CDC tool reads the transaction log from where it left off, even after restarts.

**Debezium** is the most popular open-source CDC tool. It reads transaction logs from PostgreSQL, MySQL, MongoDB, and others, and publishes changes to Kafka.

---

## The Outbox Pattern: When CDC Isn't Available

If CDC isn't available or practical, the **transactional outbox pattern** achieves similar results using only the database:

```python
def update_user(user_id, new_email):
    with db.transaction():
        db.execute("UPDATE users SET email = ? WHERE id = ?", new_email, user_id)
        db.execute(
            "INSERT INTO outbox (topic, key, payload) VALUES (?, ?, ?)",
            "user-events",
            str(user_id),
            json.dumps({"type": "email-changed", "user_id": user_id, "email": new_email})
        )
```

The database write and the outbox insert are in the same transaction — they're atomic. A separate process polls the outbox table and publishes events to Kafka, then deletes the outbox rows.

This is a form of log tailing within your application database. It's simpler than CDC (no external tool) but adds a table and a polling process.

---

## When to Use Synchronous vs Asynchronous Communication

Not everything should be async. The decision depends on whether the caller needs the result immediately.

**Use synchronous (REST/gRPC)** when:
- The client needs the result to continue (reading user data to render a page)
- The operation is fast (< 100ms)
- Strong consistency is required (the client needs to see the result of their write)

**Use asynchronous (queues/events)** when:
- The operation is slow or unreliable (sending email, generating reports)
- The result isn't needed immediately (analytics processing)
- Multiple services need to react to the same event (pub-sub)
- You need to absorb traffic bursts (queue as a buffer)
- Services should be independently deployable (loose coupling)

**Many operations use both**: a user submits an order (synchronous — returns an order ID immediately), which triggers async processing (payment, inventory reservation, shipping notification) via events.

In the next lesson, we'll go deeper into the operational challenges of event streaming: consumer lag, backpressure, partition rebalancing, and how to handle the case where your consumers can't keep up with your producers.
