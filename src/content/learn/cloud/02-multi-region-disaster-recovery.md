---
id: cloud-multi-region-dr
title: "Multi-Region Deployment and Disaster Recovery"
track: cloud
module: disaster-recovery
level: advanced
duration: 20
prerequisites: [cloud-primitives]
concepts: [multi-region, disaster-recovery, rpo, rto, active-active, active-passive, failover, data-replication]
tags: [advanced, cloud, multi-region, disaster-recovery, failover]
interactive:
  type: dr-planner
  enabled: true
order: 2
---

# Multi-Region Deployment and Disaster Recovery

On September 14, 2023, Azure's South Brazil region experienced a cooling system failure. The entire region went down. Services that ran only in South Brazil were offline for hours.

This doesn't happen often. But when it does, the question is: does your system survive?

**Disaster recovery (DR)** is the practice of designing your system so that it continues functioning (or quickly resumes functioning) when a major infrastructure failure occurs — a region going down, a data center losing power, a catastrophic software bug affecting an entire deployment.

---

## Two Numbers That Define Your DR Strategy

**RPO (Recovery Point Objective)**: How much data can you afford to lose? If your RPO is 1 hour, you can tolerate losing up to 1 hour of recent data (your backups are at most 1 hour old).

**RTO (Recovery Time Objective)**: How quickly do you need to recover? If your RTO is 30 minutes, the system must be functional within 30 minutes of a disaster.

| Strategy | RPO | RTO | Cost |
|---|---|---|---|
| Backup and restore | Hours | Hours | $ |
| Pilot light | Minutes | 10-30 min | $$ |
| Warm standby | Seconds | Minutes | $$$ |
| Active-active | Zero | Zero | $$$$ |

---

## The Strategies

**Backup and Restore**: Regular backups stored in another region. On disaster: spin up infrastructure in the backup region and restore from backup. Cheapest but slowest.

**Pilot Light**: Minimal infrastructure running in the DR region (database replicas, but no compute). On disaster: scale up compute in the DR region and point traffic to it. Faster than backup/restore because the data is already there.

**Warm Standby**: A scaled-down copy of the full system running in the DR region. On disaster: scale it up and redirect traffic. Fast recovery, moderate cost.

**Active-Active**: The full system runs in multiple regions simultaneously. Traffic is served from the nearest region. If one region fails, the others absorb its traffic automatically. Zero downtime, highest cost, most operationally complex.

---

## Active-Active: The Hardest Problem

Active-active multi-region is the gold standard for availability, but it introduces the hardest distributed systems problem: **cross-region data consistency**.

If a user writes data in the US region, the EU region needs to see it. But cross-region replication takes 50-200ms. During that window, the two regions have different data.

**Approaches**:
- **Asynchronous replication**: Writes are applied locally, then replicated. Fast writes, but brief inconsistency windows. Most read workloads tolerate this.
- **Synchronous replication**: Writes wait until confirmed in both regions. Consistent, but every write incurs cross-region latency (200ms+ added to every write). Google Spanner does this using atomic clocks (TrueTime).
- **Conflict resolution**: Allow concurrent writes in both regions and merge conflicts using CRDTs or last-writer-wins. Suitable when conflicts are rare.

**The practical path**: Most teams start with single-region + regular backups, move to warm standby when SLAs demand faster recovery, and consider active-active only when the business requires zero-downtime global presence.

---

## Testing DR: The Part Everyone Skips

A disaster recovery plan that hasn't been tested is a hypothesis, not a plan.

**Game days**: Periodically simulate a disaster — fail over to the DR region, operate from it for a few hours, then fail back. Netflix's Chaos Monkey and Chaos Kong (which simulates region failures) pioneered this practice.

**The lesson from every DR test**: Something unexpected goes wrong. A configuration that was assumed to be replicated wasn't. A DNS TTL is longer than expected. The DR region has insufficient capacity. Better to discover these during a planned test than during an actual disaster.

Schedule DR tests quarterly at minimum. Treat them as seriously as the product launches they protect.
