---
id: pattern-state-and-observer-patterns
title: "State and Observer Patterns: Managing Complex Lifecycles and Event Streams"
track: patterns
module: behavioral
level: intermediate
duration: 25
prerequisites: [pattern-strategy]
concepts: [state-pattern, observer-pattern, pub-sub, event-listeners, state-machines, lifecycle]
tags: [patterns, lld, oop, state, observer, events]
order: 2
---

# State and Observer Patterns: Complex Lifecycles and Event Streams

Managing finite state transitions and broadcasting events across decoupled components are recurring challenges in machine coding and low-level system design.

---

## 1. The State Pattern: Eliminating Giant State Machine Switches

Consider a Vending Machine or an E-Commerce Order lifecycle:
`Idle` ──► `HasMoney` ──► `Dispensing` ──► `OutOfStock`

Without the State Pattern, every method becomes a nested conditional checking current state:

```java
// CODE SMELL: FRAGILE STATE CONDITIONAL
public void insertCoin(int amount) {
    if (state == State.IDLE) {
        state = State.HAS_MONEY;
    } else if (state == State.HAS_MONEY) {
        currentBalance += amount;
    } else if (state == State.DISPENSING) {
        throw new IllegalStateException("Wait! Item is currently dispensing.");
    }
}
```

### The State Pattern Architecture
Encapsulate each distinct state into its own class implementing a common interface. The Context delegates all state-dependent actions to the current state object:

```java
public interface VendingState {
    void insertCoin(VendingMachine machine, int amount);
    void pressButton(VendingMachine machine);
    void dispense(VendingMachine machine);
}

public class IdleState implements VendingState {
    @Override
    public void insertCoin(VendingMachine machine, int amount) {
        machine.setBalance(amount);
        machine.transitionTo(new HasMoneyState()); // Clean state transition!
    }
    @Override
    public void pressButton(VendingMachine machine) {
        throw new IllegalStateException("Please insert coins first.");
    }
    @Override
    public void dispense(VendingMachine machine) {
        throw new IllegalStateException("No selection made.");
    }
}
```
- Adding a new state (e.g. `MaintenanceMode`) requires creating a single new class without modifying existing state classes.

---

## 2. The Observer Pattern: Decoupled One-to-Many Notifications

When an object's state changes, other dependent objects must be notified automatically without tightly coupling the sender to its listeners.

```
       Subject (e.g., StockTicker / OrderService)
              │
              ├──► Observer 1: Mobile Push Notification
              ├──► Observer 2: Email Invoice Dispatcher
              └──► Observer 3: Real-Time Web Dashboard (WebSocket)
```

```java
public interface Observer<T> {
    void onUpdate(T data);
}

public interface Subject<T> {
    void registerObserver(Observer<T> observer);
    void removeObserver(Observer<T> observer);
    void notifyObservers(T data);
}

public class OrderStatusSubject implements Subject<OrderStatusEvent> {
    private final List<Observer<OrderStatusEvent>> observers = new CopyOnWriteArrayList<>();

    @Override
    public void registerObserver(Observer<OrderStatusEvent> observer) {
        observers.add(observer);
    }

    @Override
    public void notifyObservers(OrderStatusEvent event) {
        for (Observer<OrderStatusEvent> observer : observers) {
            observer.onUpdate(event);
        }
    }
}
```

### Observer vs Publish-Subscribe (Pub/Sub)
- **Observer Pattern**: Typically executes **in-memory within the same process**. The Subject directly maintains references to its Observer instances.
- **Publish-Subscribe**: Operates **across distributed network boundaries** via a message broker (Kafka, Redis, RabbitMQ). Publishers and subscribers are completely anonymous and never hold references to each other.
