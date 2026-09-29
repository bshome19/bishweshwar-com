---
id: lld-framework
title: "From Requirements to Working Code: How to Design Software"
track: lld
module: design-process
level: intermediate
duration: 22
prerequisites: []
concepts: [domain-modeling, requirements-analysis, class-design, interface-design, composition, encapsulation]
tags: [intermediate, lld, object-oriented, design-process, domain-modeling]
interactive:
  type: class-diagram
  enabled: true
order: 1
---

# From Requirements to Working Code: How to Design Software

There's a moment in every project where you have requirements and need to write code. Between those two things is a gap — and how you cross that gap determines whether your code is a pleasure to work with or a minefield of hidden dependencies.

This lesson is about the process of designing software: how you go from "the system should do X" to a set of classes, interfaces, and relationships that make X easy to implement, test, and change.

---

## The Problem: Why Code Rots

Every codebase you've worked on has places you're afraid to touch. Code where a small change causes unexpected breakage in unrelated areas. Code where adding a simple feature requires modifying seven files.

This isn't bad luck. It's the result of design decisions (or lack thereof) that created tight coupling and hidden dependencies.

**Tight coupling**: Class A directly creates and uses Class B, which directly creates and uses Class C. Changing how C works requires changing B, which requires changing A. The change propagates.

**Hidden dependencies**: A function silently depends on global state, or on the current time, or on a specific file existing on disk. You can't tell from the function signature what it actually needs, so changes to those hidden dependencies break things unexpectedly.

**Rigid data models**: All behavior is crammed into a single class that grows until it does everything. Changing any behavior means touching the god class, risking breaking unrelated behavior.

Good design prevents these problems not by being clever, but by being deliberate about boundaries, dependencies, and responsibilities.

---

## Step 1: Understand the Domain

Before writing any code, understand the domain — the real-world concepts your software models.

**Example**: You're building a parking lot management system.

What are the real-world concepts?
- A **parking lot** has multiple **floors**
- Each floor has **parking spots** of different **sizes** (compact, regular, large)
- **Vehicles** of different **types** (motorcycle, car, truck) need appropriately sized spots
- Vehicles receive a **ticket** when entering
- Vehicles pay a **fee** when leaving, based on duration

These real-world concepts become your **domain entities** — the core classes in your system. Notice that the domain entities aren't about implementation details (databases, APIs, UI) — they're about the *problem space*.

---

## Step 2: Identify Responsibilities

For each domain entity, ask: **what does this entity know, and what can it do?**

**ParkingLot knows**: How many floors it has, what the fee structure is, whether it's full.
**ParkingLot can**: Accept a vehicle (assign a spot), release a vehicle (calculate fee), check availability.

**ParkingSpot knows**: Its size, its floor, whether it's occupied, which vehicle is in it.
**ParkingSpot can**: Accept a vehicle (if the size matches), release a vehicle.

**Vehicle knows**: Its type, its license plate.

**Ticket knows**: When the vehicle entered, which spot it was assigned, the vehicle details.

The **Single Responsibility Principle** says each class should have one reason to change. ParkingSpot doesn't calculate fees — that's ParkingLot's responsibility (or a separate FeeCalculator). ParkingSpot just knows about spots.

---

## Step 3: Define Interfaces, Not Implementations

Here's the key design insight: **depend on abstractions, not on concrete implementations**.

Instead of ParkingLot directly knowing about a specific fee calculation algorithm:

```python
# Bad: ParkingLot is coupled to a specific fee calculation
class ParkingLot:
    def calculate_fee(self, ticket):
        hours = (now() - ticket.entry_time).total_hours()
        return hours * 10  # $10/hour, hardcoded
```

Define an interface (or abstract class) that separates the "what" from the "how":

```python
# Good: ParkingLot depends on an abstraction
class FeeStrategy:
    def calculate(self, ticket) -> float:
        raise NotImplementedError

class HourlyFeeStrategy(FeeStrategy):
    def __init__(self, rate_per_hour):
        self.rate = rate_per_hour
    
    def calculate(self, ticket):
        hours = (now() - ticket.entry_time).total_hours()
        return math.ceil(hours) * self.rate

class FlatRateFeeStrategy(FeeStrategy):
    def __init__(self, flat_rate):
        self.rate = flat_rate
    
    def calculate(self, ticket):
        return self.rate

class ParkingLot:
    def __init__(self, fee_strategy: FeeStrategy):
        self.fee_strategy = fee_strategy
    
    def calculate_fee(self, ticket):
        return self.fee_strategy.calculate(ticket)
```

Now ParkingLot doesn't care how fees are calculated. You can switch between hourly, flat-rate, time-of-day, or any future pricing model without modifying ParkingLot. The pricing logic is isolated, testable, and swappable.

This isn't over-engineering — it's the **Strategy pattern**, and it emerges naturally when you separate the "what varies" from the "what stays the same."

---

## Step 4: Composition Over Inheritance

Inheritance seems natural: a Car IS-A Vehicle. A Motorcycle IS-A Vehicle.

But inheritance creates tight coupling between parent and child classes. The child inherits all of the parent's behavior — including behavior it might not want. And changing the parent changes all children.

**Composition** — having objects contain other objects — is usually more flexible:

```python
# Inheritance approach:
class Vehicle:
    def can_fit(self, spot_size): ...

class Car(Vehicle):
    def can_fit(self, spot_size):
        return spot_size in ["regular", "large"]

class Truck(Vehicle):
    def can_fit(self, spot_size):
        return spot_size == "large"

# Composition approach:
class Vehicle:
    def __init__(self, vehicle_type, required_spot_size):
        self.type = vehicle_type
        self.required_spot_size = required_spot_size

class SpotMatcher:
    COMPATIBLE_SIZES = {
        "compact": ["compact", "regular", "large"],
        "regular": ["regular", "large"],
        "large": ["large"],
    }
    
    def can_fit(self, vehicle, spot):
        return spot.size in self.COMPATIBLE_SIZES[vehicle.required_spot_size]
```

The composition approach is more flexible — adding a new vehicle type doesn't require a new class, just a new configuration. The matching logic is in one place (SpotMatcher), not scattered across subclasses.

**Use inheritance when**: There's a genuine "is-a" relationship AND the parent class represents a meaningful abstraction (not just code reuse). Use **composition when**: You're combining behaviors from multiple sources, or when the relationship is more "has-a" or "uses-a."

---

## Step 5: Design for Testability

Code that's well-designed is naturally testable. If your code is hard to test, that's usually a signal that the design has problems.

**Hard to test** (depends on real time, real database):
```python
class ParkingLot:
    def calculate_fee(self, ticket):
        hours = (datetime.now() - ticket.entry_time).total_hours()
        rate = Database.get_rate()  # Hard-coded database dependency
        return hours * rate
```

**Easy to test** (dependencies are injected):
```python
class ParkingLot:
    def __init__(self, fee_strategy, clock=None):
        self.fee_strategy = fee_strategy
        self.clock = clock or SystemClock()
    
    def calculate_fee(self, ticket):
        return self.fee_strategy.calculate(ticket, self.clock.now())

# Test with a fake clock:
fake_clock = FakeClock(fixed_time=datetime(2024, 1, 1, 14, 0))
lot = ParkingLot(HourlyFeeStrategy(10), clock=fake_clock)
ticket = Ticket(entry_time=datetime(2024, 1, 1, 12, 0))
assert lot.calculate_fee(ticket) == 20  # 2 hours × $10
```

**Dependency injection** — passing dependencies in rather than creating them internally — is the key technique. It lets you substitute test doubles (fakes, mocks, stubs) during testing.

---

## The Design Process Summary

1. **Understand the domain**: What are the real-world concepts?
2. **Identify entities and responsibilities**: What does each entity know and do?
3. **Define interfaces**: Separate what varies from what's stable
4. **Prefer composition**: Combine behaviors through containment, not inheritance
5. **Design for testability**: Inject dependencies, avoid hidden state

This process isn't linear — you'll iterate, discover new entities, move responsibilities between classes. That's normal. The goal isn't a perfect design on the first try — it's a design that's easy to evolve as you learn more.

In the next lesson, we'll go deeper into the SOLID principles — the five specific design guidelines that, when you understand their motivation, make most design decisions obvious.
