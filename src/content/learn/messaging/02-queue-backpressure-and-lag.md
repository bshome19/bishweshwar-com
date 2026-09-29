---
id: messaging-backpressure-lag
title: "When Consumers Can't Keep Up: Lag, Backpressure, and Dead Letters"
track: messaging
module: operational-messaging
level: intermediate
duration: 18
prerequisites: [messaging-event-streaming-cdc]
concepts: [consumer-lag, backpressure, dead-letter-queue, poison-pill, rebalancing, replay, offset-management]
tags: [intermediate, messaging, consumer-lag, backpressure, dead-letter-queue, operations]
interactive:
  type: consumer-lag
  enabled: true
order: 2
---

# When Consumers Can't Keep Up: Lag, Backpressure, and Dead Letters

You've deployed your Kafka consumer. It processes order events and updates an analytics database. In testing, it handled 500 events per second beautifully.

Monday morning: a flash sale sends 5,000 events per second. Your consumer processes 500/second. The remaining 4,500 accumulate in Kafka. After 1 hour, there are 16 million unprocessed events. Your analytics dashboard is an hour behind reality.

This is **consumer lag** — the gap between where the producer is writing and where the consumer is reading. And dealing with it is one of the most common operational challenges in event-driven systems.

---

## Understanding Consumer Lag

In Kafka, lag is measured in **offset distance**: the difference between the latest offset (most recent message written by the producer) and the consumer's current offset (most recent message processed).

```
Partition:  [msg1] [msg2] [msg3] [msg4] [msg5] [msg6] [msg7] [msg8]
                                                              ↑ Producer offset: 8
                               ↑ Consumer offset: 4
                               
Consumer lag = 8 - 4 = 4 messages
```

A lag of zero means the consumer is fully caught up. Growing lag means the consumer is falling behind. Steady lag (not growing) means the consumer is processing at the same rate as the producer but hasn't caught up yet.

**Why lag matters**: In many systems, lag equals staleness. If your search indexer has 1 million events of lag, recently published content won't appear in search results. If your notification service has lag, users get their notifications late. If your fraud detection service has lag, fraudulent transactions aren't caught in time.

---

## Why Consumers Fall Behind

**Processing is slower than production**: The most common cause. The consumer does expensive work per message (database writes, API calls, complex computation) and simply can't keep up with the volume.

**Consumer rebalancing**: When a consumer instance joins or leaves a consumer group, Kafka redistributes partitions. During rebalancing, consumption pauses for seconds to minutes. With high-throughput topics, this pause can create significant lag.

**Poison pills**: A malformed message that causes the consumer to crash or throw an exception. If the consumer retries the message, it crashes again. Stuck in an infinite loop, it stops making progress.

**Downstream dependency issues**: The consumer writes to a database or calls another service. If that dependency is slow or down, the consumer blocks and falls behind.

**GC pauses**: In JVM-based consumers, garbage collection can pause processing. Long pauses cause the consumer to miss heartbeats, triggering rebalancing (which pauses processing further).

---

## Strategies for Handling Lag

### Scale Consumers Horizontally

If one consumer processes 500 events/second and you need 5000/second: add more consumers.

But there's a constraint: **you can't have more consumers in a group than partitions**. Each partition is assigned to exactly one consumer. If you have 6 partitions and 10 consumers, 4 consumers sit idle.

To scale beyond the current number of partitions, you need more partitions. Kafka allows adding partitions to a topic (but not removing them), and this is a standard scaling operation. Plan for growth when creating topics — start with more partitions than you currently need.

### Batch Processing

Instead of processing messages one at a time, consume in batches and process them together:

```python
while True:
    messages = consumer.poll(timeout_ms=100, max_records=500)
    
    if messages:
        # Batch insert into database (1 query instead of 500)
        batch = [transform(msg) for msg in messages]
        db.bulk_insert(batch)
        consumer.commit()
```

Batch database inserts are dramatically faster than individual inserts. A batch of 500 might take 50ms — the same time as a single insert. This can increase throughput by 100x or more.

### Async Processing Within the Consumer

The consumer doesn't have to be single-threaded. Use a thread pool to process multiple messages concurrently:

```python
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=20)

while True:
    messages = consumer.poll(timeout_ms=100)
    futures = [executor.submit(process, msg) for msg in messages]
    
    # Wait for all to complete before committing offsets
    for future in futures:
        future.result()
    
    consumer.commit()
```

Caution: if processing order matters within a partition, parallel processing requires careful coordination.

---

## Dead Letter Queues: When Messages Can't Be Processed

A **dead letter queue (DLQ)** is a special queue where messages that fail processing repeatedly are sent. Instead of retrying forever (blocking all subsequent messages), the consumer sends the problematic message to the DLQ and moves on.

```python
def process_message(message):
    for attempt in range(3):  # Retry up to 3 times
        try:
            handle(message)
            return  # Success
        except Exception as e:
            log.warning(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)  # Exponential backoff
    
    # All retries exhausted: send to dead letter queue
    dead_letter_producer.send("orders-dlq", message)
    log.error(f"Message sent to DLQ after 3 failures: {message}")
```

The DLQ serves two purposes:
1. **Unblock the consumer**: The poison pill doesn't block all subsequent messages
2. **Preserve failed messages for investigation**: An engineer can examine the DLQ, fix the bug, and replay the messages

**DLQ best practices**:
- Include the original topic, partition, offset, and error details as metadata
- Monitor DLQ depth — a growing DLQ means something is systematically broken
- Set up alerts when any messages land in the DLQ
- Build tooling to replay DLQ messages back to the original topic after fixing the issue

---

## Offset Management: Where Exactly Are You?

In Kafka, the consumer tracks its position via **offsets**. Managing offsets correctly determines whether you lose messages or process them multiple times.

**Auto-commit (dangerous default)**: Kafka periodically commits the consumer's offset automatically. If the consumer crashes between processing a message and the next auto-commit, the offset wasn't saved — the message will be reprocessed on restart (at-least-once). If auto-commit happens before processing completes and the consumer crashes, the offset was saved but the message wasn't fully processed — data loss (at-most-once).

**Manual commit (safer)**: Commit the offset only after successfully processing the message.

```python
while True:
    messages = consumer.poll(timeout_ms=100)
    
    for message in messages:
        process(message)     # Process first
    
    consumer.commit()        # Then commit offset
```

If the consumer crashes after processing but before committing: the message is reprocessed on restart (duplicate). This is at-least-once delivery — the consumer must handle duplicates idempotently.

**Commit frequency trade-off**: Committing after every message is safest but slow. Committing every N messages or every T seconds is faster but means up to N messages or T seconds of reprocessing after a crash.

---

## Consumer Group Rebalancing: The Pause That Hurts

When a consumer instance in a group starts or stops, Kafka needs to reassign partitions. This is called **rebalancing**. During a rebalance, all consumers in the group pause consumption.

**Why rebalancing is painful**: In a high-throughput system, even a 30-second rebalance pause can create significant lag. And rebalancing is triggered by common events: deploying new code (rolling restart = repeated rebalancing), auto-scaling up/down, consumer crashes.

**Strategies to minimize rebalancing pain**:

**Incremental cooperative rebalancing**: Newer Kafka consumers support a rebalancing protocol where only the affected partitions pause, not all partitions. This dramatically reduces the blast radius.

**Static group membership**: Assign consumers fixed member IDs. If a consumer restarts with the same ID, it gets the same partitions back without triggering a full rebalance. Great for rolling deployments.

**Increase session timeout**: A longer session timeout means brief pauses (GC, temporary network issues) don't trigger unnecessary rebalancing. The trade-off is slower detection of truly dead consumers.

---

## Replay: The Superpower of Event Logs

One of Kafka's most powerful features: **you can replay events from the past**.

Consumer offset can be reset to:
- The beginning of the topic (replay everything)
- A specific timestamp ("replay from yesterday at 2pm")
- A specific offset

**When replay is invaluable**:

**Bug fix**: You discover your analytics consumer had a bug that miscounted orders for the past week. Fix the bug, reset the offset to a week ago, replay all events. Your analytics are now correct.

**New consumer**: You build a new search indexing service. Instead of waiting for new data, reset the offset to the beginning and index all historical data. The service starts fully populated.

**Schema change**: You change how you transform events. Reset and replay with the new transformation logic.

**This is why Kafka's retention matters**: Set retention to match how far back you might need to replay. For critical topics, retention of 30 days or even "forever" (with compaction) is common.

---

## The Monitoring Essentials

For any production messaging system, monitor:

1. **Consumer lag per consumer group per partition**: The single most important metric. Growing lag = problem.
2. **Consumer processing rate**: Messages processed per second. Dropping rate = something is slowing down.
3. **Error rate**: Failed message processing attempts. Rising errors might indicate a poison pill or downstream issue.
4. **DLQ depth**: Messages in the dead letter queue. Non-zero = investigation needed.
5. **Rebalance frequency**: Frequent rebalances indicate instability (crashing consumers, GC issues).

Most teams use Kafka's built-in JMX metrics, Prometheus exporters, or managed Kafka's built-in monitoring. Burrow (from LinkedIn) is a popular open-source consumer lag monitoring tool.

The overall lesson: event streaming is powerful but requires operational maturity. The value of async, decoupled, replayable events is enormous — but only if you monitor lag, handle failures, and scale consumers to match production rates.
