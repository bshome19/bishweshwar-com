---
id: reliability-circuit-breakers-retries
title: "How Systems Fail (And How They Recover)"
track: reliability
module: failure-patterns
level: advanced
duration: 25
prerequisites: [distributed-systems-cap-pacelc]
concepts: [circuit-breaker, retry, exponential-backoff, timeout, cascading-failures, bulkhead, graceful-degradation]
tags: [advanced, reliability, circuit-breaker, retries, timeouts, cascading-failures]
interactive:
  type: circuit-breaker-simulator
  enabled: true
order: 1
---

# How Systems Fail (And How They Recover)

The question isn't whether your system will fail. It will fail. The question is *how it fails* — whether it fails catastrophically, taking everything down with it, or whether it fails gracefully, degrading predictably while maintaining core functionality.

The difference between these two failure modes isn't luck or hardware. It's design.

This lesson is about the patterns that make the difference: how services detect that their dependencies are failing, how they protect themselves from cascading failures, and how they recover when their dependencies come back.

---

## The Cascade: How Small Failures Become Big Ones

Here's a failure mode that has taken down some of the world's largest systems, and it happens through a completely understandable chain of events.

You have a service (call it Service A) that depends on another service (Service B). Service B handles one specific function — maybe it fetches user preferences.

Service B starts having trouble. Maybe its database is under heavy load. Its response time increases from 20ms to 3 seconds.

Service A is making calls to Service B and waiting. Those calls are slow (3 seconds instead of 20ms). Service A is using a thread pool to handle requests — say, 100 threads. Each thread that's waiting for a slow Service B response is blocked for 3 seconds instead of 20ms.

At the old response time (20ms), 100 threads could handle 100,000 requests over 20 seconds. At the new response time (3000ms), 100 threads can only handle ~33 requests over the same time.

Incoming requests start queuing. The queue grows. Memory fills up with queued requests. Service A starts running out of resources. Service A's response time increases too.

Now, Service A's upstream caller — Service C — is seeing slow responses from Service A. Service C's thread pool fills up with blocked threads. Service C starts queuing. And so on.

A single slow dependency has caused a **cascading failure** that propagates through the entire system. Service B was slow, not down. Service A handled it by waiting, not by failing fast. The waiting caused resource exhaustion. The resource exhaustion cascades.

This is why **a slow response is often worse than no response**. A failed request frees resources immediately. A slow response holds resources for seconds.

---

## Timeouts: The First Line of Defense

The simplest defense against slow dependencies: **set aggressive timeouts on every remote call**.

```python
def get_user_preferences(user_id):
    try:
        # Don't wait more than 500ms for preferences
        response = requests.get(
            f"http://service-b/preferences/{user_id}",
            timeout=0.5  # 500ms
        )
        return response.json()
    except requests.exceptions.Timeout:
        # Service B is slow: return defaults instead of blocking
        return DEFAULT_PREFERENCES
```

If Service B is slow, the timeout triggers after 500ms, not 3000ms. Your thread is released. Your resources aren't exhausted. The slowness doesn't cascade.

**But timeouts alone aren't enough**. Every call to Service B still takes 500ms to timeout. If Service B is having a bad time, you're spending 500ms on every request, accumulating timeout errors. You're still doing the work of sending requests to a service that's clearly not responding.

What you need is a way to detect when a dependency is in a failed state and *stop calling it entirely* until it recovers. That's the circuit breaker.

---

## The Circuit Breaker Pattern

The circuit breaker is a state machine inspired by the electrical circuit breaker in your home. When something goes wrong (a power surge, a short circuit), the breaker "trips" — interrupting the circuit — to protect the rest of your home's wiring from damage.

A software circuit breaker has three states:

```
                  Failure threshold exceeded
CLOSED ──────────────────────────────────────► OPEN
(normal)                                       (failing)
   ▲                                              │
   │                                              │ Timeout period elapsed
   │ Probe succeeds                               ▼
   └────────────────────────────────────── HALF-OPEN
                                           (testing)
```

**CLOSED** (circuit is conducting, requests flow normally):
- Requests pass through to the dependency
- Track recent failures: if failure rate exceeds a threshold (say, 50% failure rate over last 10 seconds), trip to OPEN

**OPEN** (circuit is tripped, requests fail immediately):
- Don't even try to call the dependency
- Return an error or fallback immediately
- After a timeout period (say, 30 seconds), transition to HALF-OPEN to test if the dependency recovered

**HALF-OPEN** (testing recovery):
- Allow one request through to the dependency
- If it succeeds: transition back to CLOSED (dependency recovered)
- If it fails: transition back to OPEN for another timeout period

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.state = "CLOSED"
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_opened_at = None
    
    def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_opened_at > self.recovery_timeout:
                self.state = "HALF-OPEN"
            else:
                raise CircuitOpenError("Circuit is open — service unavailable")
        
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF-OPEN":
                self.reset()  # Recovery confirmed
            return result
        except Exception as e:
            self.record_failure()
            raise
    
    def record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            self.last_opened_at = time.time()
    
    def reset(self):
        self.state = "CLOSED"
        self.failure_count = 0
```

The circuit breaker turns a "wait and fail slowly" pattern into a "fail fast and try again later" pattern. When Service B is having trouble, Service A stops hammering it with requests (which would make its recovery harder) and starts returning fast fallbacks.

**The critical behavior**: when Service B starts recovering, the circuit breaker's HALF-OPEN state allows it to gently probe whether the service is ready. One request, not a thousand.

---

## Retries: The Right Way and the Wrong Way

Retrying failed requests seems obviously useful. If a request failed because of a transient network hiccup, retrying will succeed. No need to surface the error to the user.

But naive retries can make failures dramatically worse.

**The retry storm**: Service B is overloaded — it's failing because it can't handle the load. Every client retries failed requests immediately. Now instead of N requests hitting Service B, it's receiving 3N or 5N requests (original + retries). Exactly the wrong thing to do when a service is already overloaded.

**The correct retry strategy**: **exponential backoff with jitter**.

```python
import random
import time

def call_with_retry(func, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries + 1):
        try:
            return func()
        except RetryableError as e:
            if attempt == max_retries:
                raise  # Out of retries
            
            # Exponential backoff: 100ms, 200ms, 400ms...
            delay = base_delay * (2 ** attempt)
            
            # Full jitter: pick random value between 0 and delay
            # This prevents synchronized retries from multiple clients
            jitter = random.uniform(0, delay)
            
            time.sleep(jitter)
    
# Retry intervals: ~0-100ms, ~0-200ms, ~0-400ms
# Different clients hit different times → no synchronized thundering herd
```

**Exponential backoff** doubles the wait time with each retry. If the first retry is after 100ms, the second is after 200ms, the third after 400ms. This gives the failing service time to recover between attempts.

**Full jitter** adds randomness. Without jitter, all clients retry at exactly the same exponential intervals. If 1000 clients backed off for 400ms, they all retry simultaneously at 400ms — another thundering herd. With full jitter, each client waits a random amount in the range [0, 400ms], spreading the load.

**Only retry idempotent operations**: Retrying a GET request is safe. Retrying a POST that creates an order might create two orders. Make write operations idempotent (safe to call multiple times) before retrying them — use idempotency keys so the server can detect and deduplicate duplicate requests.

---

## Graceful Degradation: Serving Something Instead of Nothing

When a dependency fails, you have choices:
1. **Fail entirely**: Return an error to the user ("sorry, service unavailable")
2. **Serve a degraded response**: Return something less than ideal but still useful

Option 2 is almost always better. Users prefer degraded functionality to no functionality.

**Examples of graceful degradation**:

*E-commerce recommendation engine is down*: Show generic "popular items" instead of personalized recommendations. The page still loads. Users can still browse and buy.

*User preferences service is down*: Show the interface with default settings instead of the user's personalized ones. Users can still use the app; they just see the default theme.

*Real-time inventory count is slow*: Show "In stock" (or "Limited availability") from a cached count instead of hanging on the real-time check. Some edge cases of displaying incorrect availability are better than all users seeing timeouts.

*Search ranking service is down*: Return results in chronological order instead of relevance-ranked. Search still works; results are less personalized.

The pattern is: **identify which features depend on which services, and design fallbacks for each service failure mode**.

This requires upfront design thought: "what does this page/feature look like if the recommendation service is down? If the preferences service is down? If the search ranking service is down?" The answers become your fallback behaviors.

---

## Bulkheads: Containing the Blast Radius

A bulkhead in ship design is a sealed partition. If one compartment floods, the bulkhead prevents the water from spreading to other compartments. The ship can survive.

In software, a bulkhead pattern contains the blast radius of failures by **limiting the resources any single dependency can consume**.

The naive approach: all service calls from Service A share one thread pool. If Service B starts being slow, its calls fill the pool. Now calls to Service C are also blocked, even though Service C is healthy.

With bulkheads: Service B gets its own thread pool (say, 20 threads). Service C gets its own thread pool (say, 20 threads). If Service B's 20 threads are all blocked, calls to Service C still have 20 available threads. The slowness is contained.

```python
# Bulkhead: separate thread pools per dependency
user_service_pool = ThreadPool(max_workers=20)
order_service_pool = ThreadPool(max_workers=20)
inventory_service_pool = ThreadPool(max_workers=10)

def handle_request():
    # User service uses its own pool — order/inventory calls unaffected
    user = user_service_pool.submit(get_user, user_id).result()
    order = order_service_pool.submit(get_order, order_id).result()
```

Bulkheads are also used at the network level (separate connection pools per dependency) and at the infrastructure level (separate server clusters for critical vs non-critical workloads).

---

## Putting It Together: The Layered Defense

A resilient service implements multiple layers of protection:

1. **Timeouts on every external call**: Fail fast if the dependency is slow
2. **Circuit breakers per dependency**: Stop calling dependencies that are clearly failing
3. **Retry with exponential backoff + jitter**: Recover from transient failures without overwhelming already-struggling services
4. **Bulkheads**: Contain the resource exhaustion from one failing dependency
5. **Graceful degradation**: Serve a degraded response when dependencies fail
6. **Observability**: Track circuit breaker states, retry rates, timeout rates — so you can see failure modes before they cascade

These aren't alternative approaches — they work together. The circuit breaker prevents you from calling a failing dependency. The timeout prevents indefinite waits when the circuit breaker is HALF-OPEN. Exponential backoff prevents retry storms when the circuit opens and closes rapidly. Bulkheads limit the damage even before the circuit breaker trips. Graceful degradation ensures users still get something.

None of these are complex. Each is a simple mechanism. Their power comes from composition.

In the next lesson, we'll look at the other side of reliability: how to measure it. What is an SLO? What is an error budget? How do you talk about reliability in a way that leads to good engineering decisions?
