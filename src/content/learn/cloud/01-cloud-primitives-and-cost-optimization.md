---
id: cloud-primitives
title: "What Cloud Actually Gives You (And What It Hides)"
track: cloud
module: cloud-fundamentals
level: advanced
duration: 20
prerequisites: [scalability-horizontal-scaling]
concepts: [regions, availability-zones, vpc, load-balancers, managed-services, iac, cost-optimization]
tags: [advanced, cloud, infrastructure, aws, gcp, regions, managed-services]
interactive:
  type: cloud-architecture
  enabled: true
order: 1
---

# What Cloud Actually Gives You (And What It Hides)

Cloud providers sell managed complexity. Instead of buying servers, configuring networks, and managing databases yourself, you pay someone to do it for you — and get a self-service API to configure it.

This is genuinely valuable. But every managed service is an abstraction, and **every abstraction leaks**. Understanding what's underneath helps you make better decisions about when to use the managed version, when to build your own, and why your AWS bill suddenly doubled.

---

## The Physical Infrastructure: Regions and Availability Zones

Cloud infrastructure has a physical hierarchy:

**Region**: A geographic area (us-east-1 in Virginia, eu-west-1 in Ireland, ap-southeast-1 in Singapore). Each region is a cluster of data centers, physically separated from other regions by hundreds or thousands of kilometers.

**Availability Zone (AZ)**: An isolated data center within a region. A region typically has 3-6 AZs. Each AZ has independent power, cooling, and networking. If one AZ has a power failure, the others continue operating.

**Why this matters**: Deploying across multiple AZs gives you fault tolerance against hardware failures and data center issues. Deploying across multiple regions gives you geographic proximity to users and disaster recovery.

Most production deployments run in at least 2 AZs. Critical services run in 3. Multi-region is reserved for global services or strict disaster recovery requirements.

---

## The Core Primitives

**Compute**: Virtual machines (EC2, Compute Engine) or containers (ECS, GKE, Cloud Run). You choose the size, the OS, and pay by the hour. Containers are more operationally efficient (faster startup, better resource utilization) but require container orchestration (Kubernetes or managed equivalents).

**Networking**: Virtual Private Clouds (VPCs) are isolated network spaces where your resources live. Security groups act as firewalls. Load balancers (L4 for TCP, L7 for HTTP) distribute traffic across instances.

**Storage**: Object storage (S3, GCS) for files and backups. Block storage (EBS) for database disks. File storage (EFS) for shared filesystems. Each optimized for different access patterns.

**Databases**: Managed relational (RDS, Cloud SQL), managed NoSQL (DynamoDB, Firestore), managed caching (ElastiCache, Memorystore). The cloud handles backups, patching, failover, and replication.

---

## Managed Services: The Trade-Off

**RDS (managed PostgreSQL) vs. self-managed PostgreSQL**:

RDS gives you: automatic backups, automatic failover to a standby, automatic patching, point-in-time recovery, monitoring dashboards. You don't need a DBA.

RDS takes away: control over PostgreSQL configuration parameters (some are locked), the ability to install extensions (limited set), and flexibility in replication topology. And it costs 2-3x more than running PostgreSQL on a raw EC2 instance.

**The decision**: If you don't have a database expert on your team, use RDS. The operational burden of self-managing a database (backups, failover, security patches, monitoring) is significant, and failures are catastrophic. RDS handles the hard parts.

If you need specific extensions, custom replication, or are optimizing aggressively for cost: self-manage. But know what you're signing up for.

---

## Cost: The Surprise That Shouldn't Be

Cloud costs surprise teams because the pricing model is complex and usage-based:

**The big cost drivers**:
- **Data transfer (egress)**: Sending data out of the cloud is expensive ($0.09/GB on AWS). Receiving data in is free. This is by design — it discourages moving data out.
- **Provisioned resources**: A database provisioned for 10,000 IOPS costs the same whether you use 10,000 or 100 IOPS. Right-size your provisioning.
- **Idle resources**: An EC2 instance running 24/7 at 5% CPU utilization is paying for 100% of the time. Use auto-scaling, spot instances, or serverless to match cost to usage.
- **Cross-AZ traffic**: Communication between AZs within a region costs money ($0.01/GB). Between regions, even more. Architecture that generates excessive cross-AZ traffic accumulates cost quickly.

**Cost optimization basics**: Use reserved instances for steady-state workloads (30-60% discount). Use spot instances for fault-tolerant batch processing (up to 90% discount, but instances can be reclaimed). Use auto-scaling to match instance count to traffic. Monitor your bill weekly — surprises compound.

---

## Infrastructure as Code (IaC)

Manually clicking through the AWS console is fine for experiments. For production: **infrastructure as code**.

Tools like Terraform, Pulumi, or AWS CloudFormation let you define your infrastructure in code files:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  
  tags = {
    Name = "web-server"
  }
}
```

**Why IaC matters**:
- **Reproducible**: Run the same code and get identical infrastructure. No "it worked on my AWS account."
- **Version controlled**: Infrastructure changes go through code review, just like application code.
- **Recoverable**: If someone accidentally deletes a resource, re-run the code.
- **Auditable**: The git history shows exactly who changed what infrastructure and when.

In the next lesson, we'll look at multi-region deployment and disaster recovery — how to build systems that survive the failure of an entire cloud region.
