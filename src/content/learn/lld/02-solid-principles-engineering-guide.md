---
id: lld-solid-principles
title: "SOLID Principles: Why Your Code Breaks When You Change It"
track: lld
module: design-principles
level: intermediate
duration: 25
prerequisites: [lld-framework]
concepts: [solid, single-responsibility, open-closed, liskov-substitution, interface-segregation, dependency-inversion]
tags: [intermediate, lld, solid, design-principles, object-oriented]
interactive:
  type: solid-refactor
  enabled: true
order: 2
---

# SOLID Principles: Why Your Code Breaks When You Change It

SOLID principles have a reputation problem. They're taught as abstract rules to memorize, which makes them feel academic and disconnected from real coding.

But each SOLID principle is actually an answer to a specific, painful question:

- **S**: "Why does changing the email format break the user authentication?"
- **O**: "Why do I have to modify 15 files to add a new payment method?"
- **L**: "Why does replacing this class with a subclass cause tests to fail?"
- **I**: "Why does my simple service depend on a massive interface it barely uses?"
- **D**: "Why can't I test this class without a real database?"

Each principle identifies a specific design mistake and prescribes the fix. Let's see each one through the problem it solves.

---

## S — Single Responsibility Principle

**"A class should have one, and only one, reason to change."**

Here's a class that violates SRP:

```python
class UserService:
    def create_user(self, name, email):
        # Validate input
        if not self._is_valid_email(email):
            raise ValueError("Invalid email")
        
        # Save to database
        user = self.db.insert("users", {"name": name, "email": email})
        
        # Send welcome email
        self._send_email(email, "Welcome!", f"Hi {name}, welcome!")
        
        # Log the event
        self.logger.info(f"User created: {email}")
        
        # Update analytics
        self.analytics.track("user_created", {"email": email})
        
        return user
```

This class changes when:
- Email validation rules change
- Database schema changes
- Email templates change
- Logging format changes
- Analytics tracking changes

Five reasons to change. Every change risks breaking the others. A bug in the analytics tracking could prevent users from signing up.

**The fix**: Separate responsibilities into distinct classes.

```python
class UserRepository:
    def save(self, user_data):
        return self.db.insert("users", user_data)

class EmailValidator:
    def is_valid(self, email):
        return "@" in email and "." in email.split("@")[1]

class WelcomeEmailSender:
    def send(self, user):
        self.mailer.send(user.email, "Welcome!", f"Hi {user.name}!")

class UserService:
    def __init__(self, repo, validator, email_sender, event_bus):
        self.repo = repo
        self.validator = validator
        self.email_sender = email_sender
        self.event_bus = event_bus
    
    def create_user(self, name, email):
        if not self.validator.is_valid(email):
            raise ValueError("Invalid email")
        
        user = self.repo.save({"name": name, "email": email})
        self.event_bus.publish("user_created", user)  # Others react to this
        return user
```

Now changing email validation doesn't touch the database code. Changing the welcome email doesn't risk breaking user creation. Each class has one reason to change.

**The judgment call**: SRP doesn't mean every class has one method. It means every class has one *responsibility* — one cohesive set of related behaviors. A `UserRepository` might have `save`, `find_by_id`, `find_by_email`, and `delete` — those are all part of the single responsibility of persisting user data.

---

## O — Open/Closed Principle

**"Software entities should be open for extension, but closed for modification."**

Translation: you should be able to add new behavior without changing existing code.

Here's the problem:

```python
class NotificationService:
    def send(self, user, message, channel):
        if channel == "email":
            self.smtp.send(user.email, message)
        elif channel == "sms":
            self.twilio.send(user.phone, message)
        elif channel == "push":
            self.firebase.send(user.device_token, message)
        elif channel == "slack":
            self.slack.send(user.slack_id, message)
        # Every new channel requires modifying this method
```

Adding a new notification channel means modifying `NotificationService`. That means retesting the entire class. That means risk of breaking existing channels.

**The fix**: Define an interface and add new behavior as new implementations.

```python
class NotificationChannel:
    def send(self, recipient, message):
        raise NotImplementedError

class EmailChannel(NotificationChannel):
    def send(self, recipient, message):
        self.smtp.send(recipient.email, message)

class SMSChannel(NotificationChannel):
    def send(self, recipient, message):
        self.twilio.send(recipient.phone, message)

class SlackChannel(NotificationChannel):
    def send(self, recipient, message):
        self.slack.send(recipient.slack_id, message)

class NotificationService:
    def __init__(self, channels: dict[str, NotificationChannel]):
        self.channels = channels
    
    def send(self, user, message, channel_name):
        channel = self.channels[channel_name]
        channel.send(user, message)
```

Adding a new channel (say, WhatsApp) means creating a new `WhatsAppChannel` class and registering it. `NotificationService` doesn't change. Existing channels aren't affected.

---

## L — Liskov Substitution Principle

**"If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering any desirable property of the program."**

In plain English: subclasses should be usable wherever their parent class is expected, without surprises.

The classic violation — the Square/Rectangle problem:

```python
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def set_width(self, w):
        self.width = w
    
    def set_height(self, h):
        self.height = h
    
    def area(self):
        return self.width * self.height

class Square(Rectangle):
    def set_width(self, w):
        self.width = w
        self.height = w  # Must keep sides equal
    
    def set_height(self, h):
        self.width = h   # Must keep sides equal
        self.height = h
```

Now this code breaks:

```python
def test_rectangle(r: Rectangle):
    r.set_width(5)
    r.set_height(10)
    assert r.area() == 50  # Fails for Square! Area is 100.
```

A Square violates the Rectangle's contract: calling `set_width` shouldn't change the height. But for a Square, it has to. The subclass doesn't behave like its parent — substituting it breaks code that worked with the parent.

**The fix**: Don't make Square inherit from Rectangle. They have different behavioral contracts. Either make them siblings under a common `Shape` interface, or use immutable value objects:

```python
class Shape:
    def area(self) -> float:
        raise NotImplementedError

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def area(self):
        return self.width * self.height

class Square(Shape):
    def __init__(self, side):
        self.side = side
    
    def area(self):
        return self.side * self.side
```

**The practical test**: If your subclass overrides a method and changes its behavior in a way that breaks callers' expectations, you're violating LSP. The fix is usually: don't use inheritance here.

---

## I — Interface Segregation Principle

**"Clients should not be forced to depend on interfaces they do not use."**

A common violation:

```python
class DataStore:
    def read(self, key): ...
    def write(self, key, value): ...
    def delete(self, key): ...
    def list_all(self): ...
    def backup(self): ...
    def restore(self, backup_id): ...
    def compact(self): ...
    def get_stats(self): ...
```

A simple read-only service that just needs `read()` now depends on an interface with 8 methods. It "knows about" write, delete, backup, restore, and compact — none of which it uses. If the `backup()` signature changes, the read-only service needs to be recompiled even though it never calls `backup()`.

**The fix**: Split the interface into focused, role-specific interfaces.

```python
class Readable:
    def read(self, key): ...

class Writable:
    def write(self, key, value): ...
    def delete(self, key): ...

class Administrable:
    def backup(self): ...
    def restore(self, backup_id): ...
    def compact(self): ...

class FullDataStore(Readable, Writable, Administrable):
    # Implements everything
    ...

class ReadOnlyCache(Readable):
    # Only needs read
    ...
```

Now the read-only service depends on `Readable` — a tiny interface with one method. Changes to the admin interface don't affect it.

---

## D — Dependency Inversion Principle

**"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

This is the principle behind dependency injection, and it's the most impactful SOLID principle for testability and flexibility.

**Violation**: High-level business logic directly imports and uses low-level infrastructure.

```python
from mysql.connector import MySQLConnection

class OrderService:
    def __init__(self):
        self.db = MySQLConnection(host="db.prod.internal", port=3306)
    
    def place_order(self, order):
        self.db.execute("INSERT INTO orders ...", order)
```

`OrderService` (high-level business logic) is coupled to MySQL (low-level infrastructure). You can't test it without a MySQL database. You can't switch to PostgreSQL without rewriting `OrderService`.

**The fix**: Depend on an abstraction. Inject the implementation.

```python
class OrderRepository:  # Abstraction
    def save(self, order): ...

class MySQLOrderRepository(OrderRepository):  # Low-level implementation
    def __init__(self, connection):
        self.db = connection
    
    def save(self, order):
        self.db.execute("INSERT INTO orders ...", order)

class InMemoryOrderRepository(OrderRepository):  # Test implementation
    def __init__(self):
        self.orders = []
    
    def save(self, order):
        self.orders.append(order)

class OrderService:  # High-level, depends only on abstraction
    def __init__(self, repo: OrderRepository):
        self.repo = repo
    
    def place_order(self, order):
        self.repo.save(order)

# Production: OrderService(MySQLOrderRepository(real_connection))
# Testing: OrderService(InMemoryOrderRepository())
```

Now `OrderService` is testable without a database. And switching from MySQL to PostgreSQL means writing a new `PostgresOrderRepository` — `OrderService` doesn't change.

---

## When SOLID Is Too Much

SOLID principles are guidelines, not laws. For a 200-line script, creating interfaces and injection frameworks is overhead that adds complexity without benefit.

SOLID matters most when:
- Code will be maintained by multiple people over months or years
- Components need to be tested in isolation
- Requirements are likely to change (and they always are)

For throwaway scripts, prototypes, and small tools: write simple, direct code. Apply SOLID when the complexity of the code justifies the complexity of the design.

The goal isn't SOLID compliance — it's code that's easy to understand, test, and change. SOLID is a reliable path to that goal in non-trivial codebases.
