---
id: scalability-capacity-planning-and-littles-law
title: "Capacity Planning and Back-of-the-Envelope Math: Step-by-Step Guide"
track: scalability
module: estimations
level: intermediate
duration: 35
prerequisites: [foundations-latency-throughput]
concepts: [capacity-planning, back-of-the-envelope, littles-law, qps-estimation, storage-sizing, bandwidth-sizing]
tags: [scalability, estimations, math, capacity-planning, interview-prep]
interactive:
  type: capacity-calculator
  enabled: true
order: 1
---

# Capacity Planning and Back-of-the-Envelope Math

In high-level architecture reviews and system design interviews, you are expected to size infrastructure before writing code: How many servers do we need? How much storage will accumulate over 5 years? How much network egress will we pay for?

System architects do not guess these numbers. They use **Back-of-the-Envelope Calculations** and dimensional analysis.

---

## 1. The Power-of-Two and Storage Quick-Reference

Memorize these units and approximations cold:

| Power | Approximation | Value | Name |
| :--- | :--- | :--- | :--- |
| $2^{10}$ | $\approx 10^3$ | $1,024$ | $1\text{ Thousand (Kilo / KB)}$ |
| $2^{20}$ | $\approx 10^6$ | $1,048,576$ | $1\text{ Million (Mega / MB)}$ |
| $2^{30}$ | $\approx 10^9$ | $1,073,741,824$ | $1\text{ Billion (Giga / GB)}$ |
| $2^{40}$ | $\approx 10^{12}$ | $1,099,511,627,776$ | $1\text{ Trillion (Tera / TB)}$ |
| $2^{50}$ | $\approx 10^{15}$ | $1,125,899,906,842,624$ | $1\text{ Quadrillion (Peta / PB)}$ |

### Seconds in Time Intervals
- Seconds in 1 day = $24 \times 60 \times 60 = 86,400\text{ seconds} \approx \mathbf{10^5\text{ seconds}}$ (rounded up for quick mental math, or $86,400$ for precision).
- Seconds in 1 month $\approx 2.5 \times 10^6\text{ seconds}$.
- Seconds in 1 year $\approx 3.15 \times 10^7\text{ seconds}$.

---

## 2. Step-by-Step Capacity Estimation Example

Imagine designing a photo-sharing platform like Instagram:
- **Daily Active Users (DAU)**: $100,000,000$ ($100\text{M}$)
- **User Activity**: Each user views 40 photos/day and posts 1 photo/day.
- **Average Photo Size**: $200\text{ KB}$.
- **Metadata per Photo**: $500\text{ bytes}$.

---

### Step 1: Queries Per Second (QPS)
$$\text{Read QPS} = \frac{100,000,000\text{ users} \times 40\text{ views/day}}{86,400\text{ seconds}} \approx \frac{4\times 10^9}{8.64\times 10^4} \approx \mathbf{46,300\text{ Read QPS}}$$

$$\text{Write QPS} = \frac{100,000,000\text{ users} \times 1\text{ post/day}}{86,400\text{ seconds}} \approx \frac{10^8}{8.64\times 10^4} \approx \mathbf{1,160\text{ Write QPS}}$$

$$\text{Peak QPS (2x - 3x average)} \approx 46,300 \times 2 \approx \mathbf{92,600\text{ Peak QPS}}$$

---

### Step 2: Storage Sizing (5 Years)
Daily new photo storage:
$$100\text{M photos/day} \times 200\text{ KB} = 20,000,000\text{ MB} = 20,000\text{ GB} = \mathbf{20\text{ TB / day}}$$

With **$3\times$ replication factor** for multi-AZ disaster recovery:
$$20\text{ TB/day} \times 3 = \mathbf{60\text{ TB / day}}$$

Five-year storage requirement:
$$60\text{ TB/day} \times 365\text{ days} \times 5\text{ years} \approx \mathbf{109.5\text{ Petabytes (PB)}}$$

---

### Step 3: Network Bandwidth
Egress bandwidth (Photo serving):
$$\text{Read Throughput} = 46,300\text{ QPS} \times 200\text{ KB} \approx 9,260,000\text{ KB/s} \approx \mathbf{9.26\text{ GB/s}} = \mathbf{74.1\text{ Gbps}}$$

---

### Step 4: Sizing Cache (Pareto 80/20 Rule)
According to the 80/20 rule, 20% of the photos generate 80% of daily read traffic. If we cache 20% of daily reads in Redis:
$$\text{RAM Cache Required} = 0.20 \times 20\text{ TB/day} = \mathbf{4\text{ TB of RAM}}$$

4 TB of RAM can be comfortably distributed across a cluster of 64 Redis nodes with 64GB RAM each.

---

## Interactive Capacity Planning Calculator

Use the **System Capacity Sizing Calculator** above to dynamically calculate QPS, bandwidth, 5-year persistent storage, cache RAM sizing, and compute worker instances for your custom architecture workloads.
