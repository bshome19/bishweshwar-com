---
id: apis-idempotency-versioning
title: "Making APIs Safe and Evolvable"
track: apis
module: api-robustness
level: intermediate
duration: 18
prerequisites: [apis-rest-graphql-grpc-websockets]
concepts: [idempotency, idempotency-key, api-versioning, pagination, backward-compatibility, retry-safety]
tags: [intermediate, apis, idempotency, versioning, pagination, robustness]
interactive:
  type: idempotency-demo
  enabled: true
order: 2
---

# Making APIs Safe and Evolvable

Two scenarios that every production API will face:

**Scenario 1**: A user clicks "Place Order." Their phone has a brief network hiccup. The app retries the request. Did the user just place two orders?

**Scenario 2**: Your API has hundreds of clients. You need to change the shape of a response. Can you do it without breaking every client simultaneously?

These are the problems of **idempotency** and **versioning** — two unglamorous topics that determine whether your API is safe in the real world.

---

## Idempotency: Making Operations Safe to Retry

An operation is **idempotent** if calling it multiple times produces the same result as calling it once.

Some HTTP methods are inherently idempotent:
- `GET /users/42` — reading a user is always safe to repeat
- `PUT /users/42` with a full body — replacing a user with the same data is the same whether done once or ten times
- `DELETE /users/42` — deleting an already-deleted user is a no-op

`POST` is the dangerous one. `POST /orders` creates a new order every time it's called. If the network hiccuped and the client retries, you've got duplicate orders.

The fix is **idempotency keys**: the client generates a unique key for each logical operation and includes it in the request. The server uses this key to detect and deduplicate retries.

```python
# Client sends:
POST /orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{"product_id": 42, "quantity": 1}
```

```python
# Server implementation:
def create_order(request):
    idempotency_key = request.headers.get('Idempotency-Key')
    
    # Check if we've seen this key before
    existing = db.query(
        "SELECT response FROM idempotency_keys WHERE key = ?",
        idempotency_key
    )
    
    if existing:
        # Already processed: return the stored response
        return existing.response
    
    # First time: process the order
    order = process_new_order(request.body)
    
    # Store the key and response atomically
    db.execute(
        "INSERT INTO idempotency_keys (key, response, created_at) VALUES (?, ?, ?)",
        idempotency_key, serialize(order), now()
    )
    
    return order
```

The critical detail: **the insert into the idempotency key table and the order creation must be atomic** — in the same database transaction. Otherwise, a crash between "create order" and "store idempotency key" would result in an order without idempotency protection, and the retry would create a duplicate.

**Stripe, one of the most successful payment APIs, requires idempotency keys on all POST requests.** This isn't a nice-to-have — in a system that moves money, duplicate operations are catastrophic.

### How Long to Keep Idempotency Keys

Idempotency keys need to be stored long enough that any reasonable retry would be caught, but not forever (that would use unbounded storage).

Typical retention: 24 hours to 7 days. A retry that comes a week after the original request is almost certainly not a network retry — it's a new intent from the user.

---

## API Versioning: Changing Without Breaking

Your API is a contract. Clients depend on the shape of your responses, the behavior of your endpoints, the meaning of your error codes. Changing any of these can break clients.

But you must evolve. New features, bug fixes, performance improvements — all potentially require API changes.

There are three main versioning strategies:

**URL versioning**: `/v1/users`, `/v2/users`
```
GET /v1/users/42  → { "name": "Alice", "email": "alice@example.com" }
GET /v2/users/42  → { "name": "Alice", "email": "alice@example.com", "avatar_url": "..." }
```

Simple, explicit, easy to understand. The downside: if a client is on v1 and you introduce a breaking change in v2, they stay on v1 indefinitely unless forced to migrate. You end up maintaining multiple versions.

**Header versioning**: `Accept: application/vnd.api+json;version=2`

Less visible but keeps URLs clean. The client specifies the desired version in headers. This is what GitHub's API uses.

**Query parameter versioning**: `/users/42?api_version=2`

Simple but often considered inelegant. Stripe uses a variant of this (passing the API version in the request or as an account-level setting).

### The Real Strategy: Additive Changes Only

The best versioning strategy is to **rarely need a new major version**.

**Additive changes are safe**: Adding a new field to a response doesn't break existing clients — they'll just ignore the field they don't recognize. Adding a new optional parameter to a request doesn't break clients — they don't need to send it.

**Removing or renaming fields is breaking**: If you remove `email` from the user response, every client that reads `response.email` breaks.

**Changing the type of a field is breaking**: If `user_id` changes from integer to string, clients that parse it as an integer break.

The rule: **only make additive changes. Never remove, rename, or retype existing fields.** Deprecate fields (mark them as deprecated in documentation) but continue returning them. Remove deprecated fields only in a new major version, with a long migration window.

Protocol Buffers (used by gRPC) enforce this naturally: fields are numbered, and you never reuse a field number. You can add new fields (with new numbers) without breaking existing clients.

---

## Pagination: Handling Large Collections

`GET /users` — what if you have 10 million users? You can't return them all in one response.

**Offset pagination** (the most common):
```
GET /users?limit=20&offset=0    → Users 1-20
GET /users?limit=20&offset=20   → Users 21-40
GET /users?limit=20&offset=40   → Users 41-60
```

Simple and intuitive. But has a performance problem: `OFFSET 1000000` in SQL means the database skips 1 million rows before returning results. The deeper you paginate, the slower it gets.

And a correctness problem: if a new user is inserted while you're paginating, the offsets shift, and you either miss a user or see one twice.

**Cursor pagination** (the better approach for most APIs):
```
GET /users?limit=20                                    → Users 1-20, cursor="abc123"
GET /users?limit=20&cursor=abc123                      → Users 21-40, cursor="def456"
GET /users?limit=20&cursor=def456                      → Users 41-60, cursor="ghi789"
```

The cursor is an opaque token that encodes the position (usually the ID or timestamp of the last returned item). The server uses it to query efficiently: `WHERE id > last_seen_id ORDER BY id LIMIT 20`. This uses the index and is always fast, regardless of how deep you are in the list.

Cursor pagination also handles inserts correctly: new items don't shift existing cursors.

The trade-off: you can't jump to "page 47." You can only go forward from where you are. For most API use cases (infinite scroll, loading more results), this is fine.

**Keyset pagination** is a variant of cursor pagination where the cursor is explicit (the value of the sort key) rather than opaque. Same performance benefits, more transparent to the client.

---

## Error Design: Telling Clients What Went Wrong

Good error responses are at least as important as good success responses. A well-designed error tells the client:

1. **What happened** (error type)
2. **Why it happened** (human-readable message)
3. **What they can do about it** (is it retryable? what should they change?)

```json
{
  "error": {
    "type": "validation_error",
    "message": "The email field must be a valid email address",
    "code": "INVALID_EMAIL",
    "field": "email",
    "retryable": false
  }
}
```

Use appropriate HTTP status codes:
- **400**: Client sent a bad request (fix the request and retry)
- **401**: Not authenticated (need to log in)
- **403**: Not authorized (authenticated but not allowed)
- **404**: Resource not found
- **409**: Conflict (e.g., creating a resource that already exists)
- **422**: Unprocessable entity (structurally valid but semantically wrong)
- **429**: Rate limited (too many requests — include `Retry-After` header)
- **500**: Server error (not the client's fault — retrying might help)
- **503**: Service unavailable (temporary — retrying will likely help)

The distinction between 4xx (client errors, don't retry unchanged) and 5xx (server errors, retrying may succeed) is crucial for client retry logic.

---

## Rate Limiting: Protecting Your API

Every public API must be rate-limited. Without limits, a single misconfigured client can consume all your server resources.

Common implementations:
- **Fixed window**: Allow N requests per minute. Reset the counter every minute.
- **Sliding window**: Allow N requests in any rolling 60-second window. Smoother than fixed window.
- **Token bucket**: Tokens refill at a constant rate. Each request consumes a token. Allows bursts up to the bucket size.

Return **429 Too Many Requests** when a client exceeds their limit, with:
```
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1625097600
```

These headers tell the client exactly when they can resume — enabling them to implement proper backoff without guessing.

---

## The Practical Summary

1. **Make POST operations idempotent** with idempotency keys. Payment APIs, order APIs, any API that creates resources — all need this.
2. **Version through additive changes** whenever possible. Major versions are expensive for everyone.
3. **Use cursor pagination** for any collection that might be large.
4. **Design errors as carefully as successes** — clients spend more time handling errors than you think.
5. **Rate limit everything** — always, no exceptions for public APIs.

These aren't exciting topics. They're the boring infrastructure that separates a toy API from a production one. Getting them right from the start saves enormous pain later.
