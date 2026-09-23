---
id: apis-idempotency-and-api-versioning
title: "Robust API Design: Idempotency Keys and Zero-Downtime Evolution"
track: apis
module: reliability
level: beginner
duration: 20
prerequisites: [apis-rest-graphql-grpc-websockets]
concepts: [idempotency, distributed-locks, deduplication, api-versioning, backward-compatibility]
tags: [apis, distributed-systems, payments, reliability]
order: 2
---

# Robust API Design: Idempotency Keys and API Versioning

In a distributed network, network failures are indistinguishable from slow responses. When a client sends a payment charge request and receives a network timeout, they cannot know whether:
1. The request was dropped on the way to the server (payment was not processed).
2. The server processed the payment successfully, but the confirmation response was dropped on the return path.

If the client blindly retries the request, the user may be charged twice. Robust API architecture solves this with **Idempotency Keys**.

---

## 1. Designing an Idempotent API

An operation is **idempotent** if performing it multiple times produces the exact same outcome as performing it once.
- `GET`, `PUT`, `DELETE` are naturally idempotent by HTTP specification.
- `POST` is non-idempotent by default (creates a new resource each invocation).

### The Idempotency Key Architecture Flow

Clients generate a unique identifier (UUID v4) and attach it to the HTTP header:
`Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d`

```
Client                                API Gateway / Backend                               Redis / DB
  │                                             │                                              │
  │── POST /v1/charges (Key: "abc-123") ───────►│                                              │
  │                                             │── 1. SETNX idempotency:abc-123 (TTL: 24h) ──►│
  │                                             │◄─ Lock Acquired (Status: IN_PROGRESS) ───────│
  │                                             │                                              │
  │                                             │── [Execute Payment Processing Logic] ────────│
  │                                             │                                              │
  │                                             │── 2. Update idempotency:abc-123 ─────────────►│
  │                                             │      { status: DONE, body: {...}, code: 200 }│
  │                                             │                                              │
  │◄─ HTTP 200 OK (Charge Created) ─────────────│                                              │
  │                                                                                            │
  │=== NETWORK DROP / RETRY SCENARIO ===                                                       │
  │                                                                                            │
  │── POST /v1/charges (Key: "abc-123") ───────►│                                              │
  │                                             │── 3. Check idempotency:abc-123 ──────────────►│
  │                                             │◄─ Found: Status DONE, Cached Response ───────│
  │                                             │                                              │
  │◄─ HTTP 200 OK (Cached Response Replayed) ───│ (No secondary charge executed!)              │
```

### Critical Edge Cases
1. **Concurrent Duplicate Requests**: If a client sends two identical requests simultaneously, the second request hits the lock with status `IN_PROGRESS` and should return an immediate HTTP `409 Conflict` advising the client to wait.
2. **Payload Mutation**: If a client sends the same `Idempotency-Key` with a completely different request body, the server must reject it with HTTP `422 Unprocessable Entity` or `400 Bad Request` to prevent key hijacking.
3. **Atomic Persistence**: In transactional systems, the idempotency record and the business domain record should be committed within the exact same database transaction.

---

## 2. Zero-Downtime API Versioning and Backward Compatibility

APIs evolve constantly, but public clients and older mobile apps cannot be forced to update simultaneously. Breaking API changes risk breaking live production clients.

### Versioning Strategies
1. **URI Path Versioning** (`/v1/users`, `/v2/users`):
   - **Pros**: Highly visible, easy to route at reverse proxies (Nginx/Envoy).
   - **Cons**: Can lead to code duplication across entire API surface areas.
2. **Header-Based Date Versioning** (Stripe Model: `Stripe-Version: 2026-03-01`):
   - **Pros**: Client pins a specific immutable API schema date.
   - **Cons**: Requires sophisticated backend transformation layers to translate between historical schemas and modern domain models.

### The Rule of Tolerant Reader & Additive Changes
To maintain zero-downtime compatibility:
- **Never rename or delete existing fields** in JSON or Protobuf schemas.
- **Always add new fields as optional**.
- **Tolerant Reader Pattern**: Client parsers should ignore unrecognized fields rather than throwing fatal deserialization exceptions.
- **Deprecation Lifecycle**: Mark fields deprecated, log usage metrics to identify callers, and enforce a multi-quarter sunset schedule before removal.
