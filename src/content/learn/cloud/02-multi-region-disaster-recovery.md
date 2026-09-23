---
id: cloud-multi-region-disaster-recovery
title: "Multi-Region Architecture and Disaster Recovery: RTO vs RPO"
track: cloud
module: disaster-recovery
level: advanced
duration: 35
prerequisites: [cloud-primitives-and-cost-optimization, ds-cap-pacelc]
concepts: [disaster-recovery, rto, rpo, active-passive, active-active, geodns, failover]
tags: [cloud, disaster-recovery, multi-region, high-availability, architecture]
order: 2
---

# Multi-Region Architecture and Disaster Recovery: RTO vs RPO

What happens when an entire AWS region (e.g. `us-east-1`) suffers an undersea fiber cable cut, a catastrophic power failure, or a global control-plane outage?

Building a resilient multi-region architecture requires balancing business risk against engineering complexity through two core metrics: **RTO** and **RPO**.

---

## 1. RTO and RPO: The Two Golden DR Metrics

```
[Normal Operation] ──► [Disaster Occurs!] ─────────────────► [System Fully Restored]
                             │                                       │
                             │◄────── RTO (Recovery Time) ──────────►│
                             │
       │◄─── RPO ───────────►│
  [Last Backup]
(Lost Transactions)
```

- **Recovery Time Objective (RTO)**: *"How long can the business afford to be down before systems are operational again?"* (e.g., RTO = 15 minutes).
- **Recovery Point Objective (RPO)**: *"How much data loss is acceptable, measured in time?"* (e.g., if database backups run every 6 hours, your maximum potential data loss is 6 hours; RPO = 6 hours).

---

## 2. The Four Disaster Recovery Strategies

```
Cost & Complexity                                                     Recovery Speed
   ▲                                                                        │
   │  ┌────────────────────────────────────────────────────────┐            │
   │  │ 4. Multi-Region Active-Active (RTO: 0s, RPO: 0s)       │            ▼
   │  ├────────────────────────────────────────────────────────┤        Near Zero
   │  │ 3. Warm Standby (Pilot Light) (RTO: Minutes, RPO: Low) │        Downtime
   │  ├────────────────────────────────────────────────────────┤
   │  │ 2. Cold Standby (Provisioned on demand) (RTO: Hours)   │
   │  ├────────────────────────────────────────────────────────┤
   │  │ 1. Backup & Restore (S3 Backups) (RTO: 24h, RPO: 24h)  │
   │  └────────────────────────────────────────────────────────┘
```

### 1. Backup & Restore (Cheapest, Highest RTO/RPO)
- Regularly snapshot databases to S3 and replicate across regions.
- If disaster strikes, spin up new Kubernetes clusters and restore database snapshots from scratch.
- **RTO**: 12–24 hours. **RPO**: Hours of data loss.

### 2. Pilot Light / Warm Standby
- Maintain a scaled-down minimal footprint running in Region B (e.g. 1 minimal database replica continuously replicating WAL logs).
- Upon disaster, auto-scaling groups ramp up web compute from 2 pods to 500 pods in Region B, and promote the replica to primary.
- **RTO**: 10–30 minutes. **RPO**: Seconds to minutes.

### 3. Active-Active Multi-Region (The Holy Grail)
- Both Region A (e.g., US East) and Region B (e.g., US West) actively serve live user traffic simultaneously.
- If Region A collapses, **Anycast DNS / Cloudflare** instantly shifts 100% of global traffic to Region B with **zero downtime (RTO $\approx 0$)**.

### The Catch: Multi-Master Conflict Resolution
In Active-Active, if a user updates their password in Region A at the exact same millisecond that a password reset arrives in Region B:
- Speed of light between Virginia and Oregon takes $\approx 70\text{ms}$.
- Synchronous two-phase commit across regions makes every write latency $>100\text{ms}$.
- Requires **Globally Distributed Databases** (like Google Cloud Spanner using TrueTime GPS atomic clocks, or CockroachDB Raft-based consensus per range).
