---
id: patterns-strategy
title: "Design Patterns: Solutions That Emerged from Real Pain"
track: patterns
module: behavioral-patterns
level: beginner
duration: 20
prerequisites: []
concepts: [strategy-pattern, factory-pattern, template-method, observer-pattern, design-patterns]
tags: [beginner, patterns, strategy, factory, behavioral-patterns]
interactive:
  type: pattern-refactor
  enabled: true
order: 1
---

# Design Patterns: Solutions That Emerged from Real Pain

Design patterns have an unfair reputation. They're taught as a catalog — "here are 23 patterns, memorize them" — which makes them feel like academic jargon. Engineers either cargo-cult them everywhere (StrategyFactoryBuilderAdapterProxyManager) or dismiss them entirely ("patterns are over-engineering").

Both extremes miss the point. Every design pattern is a **solution to a recurring problem**. The pattern exists because enough engineers ran into the same problem and converged on the same shape of solution. Understanding the *problem* each pattern solves makes the pattern obvious, memorable, and impossible to misuse.

---

## The Strategy Pattern: When Behavior Needs to Vary

**The problem**: You have an algorithm that needs to work differently depending on context, but the surrounding code is the same.

A sorting function that needs different comparison strategies. A payment processor that supports credit cards, PayPal, and crypto. A notification system that sends via email, SMS, or push notification.

The naive approach: a big `if/else` or `switch` statement.

```python
def process_payment(amount, method):
    if method == "credit_card":
        # 20 lines of credit card processing
        ...
    elif method == "paypal":
        # 20 lines of PayPal processing
        ...
    elif method == "crypto":
        # 20 lines of crypto processing
        ...
    # Adding a new method? Modify this function. Hope you don't break the others.
```

**The Strategy pattern**: Extract each algorithm into its own object that implements a common interface.

```python
class PaymentStrategy:
    def process(self, amount) -> bool:
        raise NotImplementedError

class CreditCardPayment(PaymentStrategy):
    def process(self, amount):
        # Credit card specific logic
        return self.gateway.charge(amount)

class PayPalPayment(PaymentStrategy):
    def process(self, amount):
        # PayPal specific logic
        return self.paypal_api.execute_payment(amount)

class PaymentProcessor:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy
    
    def checkout(self, amount):
        if self.strategy.process(amount):
            self.record_transaction(amount)
```

Adding a new payment method? Write a new class. Nothing existing changes. That's the Open/Closed Principle in action.

**When you need Strategy**: When you have multiple ways of doing the same thing, and the choice between them shouldn't be hardcoded.

---

## The Factory Pattern: When Object Creation Is Complex

**The problem**: Creating an object requires complex logic, and you don't want that logic scattered everywhere an object is created.

```python
# Without Factory — creation logic everywhere:
if config.type == "mysql":
    db = MySQLConnection(config.host, config.port, config.ssl_cert)
elif config.type == "postgres":
    db = PostgresConnection(config.host, config.port, config.connection_pool_size)
elif config.type == "sqlite":
    db = SQLiteConnection(config.file_path)

# This same block appears in 5 different files. Change the creation logic?
# Change it in all 5 places.
```

**The Factory pattern**: Centralize object creation in one place.

```python
class DatabaseFactory:
    @staticmethod
    def create(config) -> Database:
        if config.type == "mysql":
            return MySQLConnection(config.host, config.port, config.ssl_cert)
        elif config.type == "postgres":
            return PostgresConnection(config.host, config.port, config.pool_size)
        elif config.type == "sqlite":
            return SQLiteConnection(config.file_path)
        else:
            raise ValueError(f"Unknown database type: {config.type}")

# Usage everywhere:
db = DatabaseFactory.create(config)
```

One place to change. One place to test. One place to add new database types.

**Abstract Factory** goes one level further: a factory that creates families of related objects (e.g., a UI toolkit factory that creates buttons, text fields, and dropdowns — all matching a specific theme).

---

## The Observer Pattern: When Something Happens and Others Need to Know

**The problem**: When an event occurs (user signs up, order placed, payment received), multiple parts of the system need to react. But you don't want the event source to know about every reactor.

```python
# Without Observer — tight coupling:
class OrderService:
    def place_order(self, order):
        self.save_order(order)
        self.email_service.send_confirmation(order)    # Knows about email
        self.inventory_service.reserve_items(order)     # Knows about inventory
        self.analytics_service.track_purchase(order)    # Knows about analytics
        self.loyalty_service.add_points(order)          # Knows about loyalty
        # Adding a new reactor? Modify OrderService.
```

OrderService knows about every service that cares about orders. Adding a fraud detection service means modifying OrderService.

**The Observer pattern**: The event source publishes events. Interested parties subscribe. The source doesn't know or care who's listening.

```python
class EventBus:
    def __init__(self):
        self.subscribers = defaultdict(list)
    
    def subscribe(self, event_type, handler):
        self.subscribers[event_type].append(handler)
    
    def publish(self, event_type, data):
        for handler in self.subscribers[event_type]:
            handler(data)

# Registration (at startup):
event_bus.subscribe("order_placed", email_service.send_confirmation)
event_bus.subscribe("order_placed", inventory_service.reserve_items)
event_bus.subscribe("order_placed", analytics_service.track_purchase)

# OrderService is clean:
class OrderService:
    def place_order(self, order):
        self.save_order(order)
        self.event_bus.publish("order_placed", order)
```

Adding fraud detection? Just subscribe to "order_placed". OrderService doesn't change.

**This pattern scales to distributed systems**: The in-process EventBus becomes Kafka or RabbitMQ. The concept is identical — publishers and subscribers, decoupled through events. Understanding the Observer pattern in code makes event-driven architecture intuitive.

---

## The Decorator Pattern: Adding Behavior Without Changing Code

**The problem**: You want to add functionality (logging, caching, rate-limiting, authentication) to an existing object without modifying it.

```python
class UserRepository:
    def find_by_id(self, user_id):
        return self.db.query("SELECT * FROM users WHERE id = ?", user_id)
```

You want to add caching. You could modify `find_by_id` to check cache first. But what if you also want logging? And rate limiting? The method gets cluttered with non-core concerns.

**The Decorator pattern**: Wrap the object with layers that add behavior.

```python
class CachingUserRepository:
    def __init__(self, inner: UserRepository, cache):
        self.inner = inner
        self.cache = cache
    
    def find_by_id(self, user_id):
        cached = self.cache.get(f"user:{user_id}")
        if cached:
            return cached
        user = self.inner.find_by_id(user_id)
        self.cache.set(f"user:{user_id}", user, ttl=300)
        return user

class LoggingUserRepository:
    def __init__(self, inner: UserRepository, logger):
        self.inner = inner
        self.logger = logger
    
    def find_by_id(self, user_id):
        self.logger.info(f"Finding user {user_id}")
        result = self.inner.find_by_id(user_id)
        self.logger.info(f"Found user {user_id}: {result is not None}")
        return result

# Compose decorators:
repo = LoggingUserRepository(
    CachingUserRepository(
        UserRepository(db),
        redis_cache
    ),
    logger
)
```

Each decorator adds one concern. They compose freely. The original `UserRepository` is unchanged. You can add or remove layers without touching any of them.

**This is how middleware works** in web frameworks: each middleware is a decorator around the request handler, adding authentication, logging, CORS, rate-limiting as composable layers.

---

## When to Use Patterns (and When Not To)

**Use a pattern when you recognize the problem it solves.** If you have multiple interchangeable algorithms: Strategy. If you need to decouple event producers from consumers: Observer. If you need to add cross-cutting concerns: Decorator.

**Don't use a pattern because it's clever.** If you have one payment method and will never add more, a Strategy pattern is unnecessary indirection. If nobody needs to observe your events, an EventBus is overhead.

**The litmus test**: Will this pattern make the code easier to change in the future? If yes, use it. If it just adds abstraction layers without a concrete benefit, skip it.

Patterns are vocabulary, not requirements. They help you communicate ("this is a Strategy") and they help you recognize solutions quickly. But they're not goals — the goal is code that's correct, understandable, and changeable.

In the next lesson, we'll cover distributed patterns — patterns that apply specifically to distributed systems: Circuit Breaker, Saga, CQRS, and the Outbox pattern. These are the patterns that emerge when your system spans multiple processes and networks.
