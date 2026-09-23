---
id: messaging-event-streaming-and-cdc
title: "Event Streaming and Change Data Capture (CDC): Eliminating Dual-Write Hazards"
track: messaging
module: async-pipelines
level: intermediate
duration: 30
prerequisites: [databases-indexes-b-trees-and-lsm-trees]
concepts: [cdc, event-streaming, kafka, outbox-pattern, dual-writes, debezium, append-only-log]
tags: [messaging, kafka, cdc, event-driven, architecture]
order: 1
---

# Event Streaming and Change Data Capture (CDC)

In modern microservice architectures, a single business event—such as a user placing an order—often requires updating multiple independent downstream systems:
1. Writing the order record to the transactional PostgreSQL database.
2. Indexing the order in Elasticsearch for full-text search.
3. Updating an analytics warehouse (Snowflake / BigQuery).
4. Invalidating the user's cached shopping cart in Redis.

How do you guarantee that all four systems stay synchronized without distributed transactions?

---

## 1. The Dual-Write Antipattern

The most common architectural bug in distributed systems is attempting to write to two independent storage systems in application code:

```
// APPLICATION CODE: THE DUAL-WRITE HAZARD
await postgres.orders.insert(order);   // Step 1: DB Commit
await elasticsearch.index(order);      // Step 2: Search Index
```

### Why Dual Writes Inevitably Corrupt Data
1. **Network Failure on Step 2**: If Step 1 succeeds and Step 2 times out or fails, the database has the order, but the search engine will never see it. Data has silently diverged.
2. **Crash Between Steps**: If the application server process crashes or gets killed by Kubernetes OOM after Step 1 but before Step 2, the event is lost forever.
3. **Concurrent Race Conditions**:
   - Thread A updates Order #100 with status `CANCELLED`.
   - Thread B updates Order #100 with status `SHIPPED`.
   - Thread A writes to DB first, then Thread B writes to DB. DB has `SHIPPED`.
   - Due to network jitter, Thread B writes to Elasticsearch first, then Thread A writes to Elasticsearch. Elasticsearch now has `CANCELLED`!
   - Your search index and primary database now permanently disagree on the order status.

Two-Phase Commit (2PC) is not the solution: it destroys availability and throughput in distributed environments.

---

## 2. Change Data Capture (CDC): Tailing the Transaction Log

The cleanest architectural solution to dual writes is **Change Data Capture (CDC)** using tools like **Debezium** and **Apache Kafka**.

```
Client
  │
  ▼ (Single Atomic Write)
PostgreSQL Primary DB ──► [Write-Ahead Log (WAL) on Disk]
                                     │
                                     ▼ (Asynchronous Log Reader)
                             Debezium CDC Connector
                                     │
                                     ▼
                             Apache Kafka Topic ("db.orders")
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
Elasticsearch Consumer      Snowflake Ingestion Worker      Redis Cache Invalidator
```

### How CDC Works
1. The application executes a single standard SQL insert/update against PostgreSQL.
2. The database atomically writes the row mutation to its low-level append-only **Write-Ahead Log (WAL / MySQL binlog)** on persistent disk.
3. A lightweight CDC process (Debezium) connects as a replication replica and continuously reads raw commit events directly from the WAL stream.
4. Debezium publishes strongly-typed change events to an Apache Kafka topic.
5. Downstream consumers (Elasticsearch, Redis, BigQuery) consume from Kafka independently at their own pace.

### Architectural Benefits
- **Zero Dual-Write Race Conditions**: The relational database remains the sole, undisputed source of truth.
- **Fault-Tolerant Replay**: If Elasticsearch goes offline for 3 hours, its Kafka consumer simply resumes reading from its last committed offset with zero data loss.
- **Decoupled Performance**: Slow search indexing or analytics writes never hold open locks on the primary OLTP database.

---

## 3. The Transactional Outbox Pattern

When you cannot run a dedicated CDC engine or need domain-specific events rather than raw database column diffs, use the **Transactional Outbox Pattern**:

```
PostgreSQL Database
┌──────────────────────────────────────────────────────────┐
│  BEGIN TRANSACTION;                                      │
│    INSERT INTO orders (id, user_id, amount) VALUES (...);│
│    INSERT INTO outbox (event_id, payload) VALUES (...);  │
│  COMMIT;                                                 │
└──────────────────────────────────────────────────────────┘
```

1. The application writes both the business entity (`orders`) and the event payload (`outbox`) inside the **exact same local ACID database transaction**.
2. A separate background polling worker (or CDC tailer) continuously reads pending records from the `outbox` table and publishes them to Kafka.
3. Guarantees **At-Least-Once Delivery** with 100% mathematical consistency without distributed locks.
