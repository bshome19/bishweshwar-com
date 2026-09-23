---
id: lld-five-step-framework
title: "LLD in 45–60 Minutes: The Five-Step Execution Framework"
track: lld
module: execution
level: intermediate
duration: 30
prerequisites: []
concepts: [solid, oop, composition, machine-coding, class-design, thread-safety, interfaces]
tags: [lld, machine-coding, interviews, oop, design]
order: 1
---

# LLD in 45–60 Minutes: The Five-Step Execution Framework

Low-Level Design (LLD) evaluates an engineer's ability to translate ambiguous requirements into clean, modular, extensible, and thread-safe object-oriented code within a strict 45–60 minute machine coding session.

Candidates frequently fail not because they don't know syntax, but because they start coding immediately without structuring their entities and interface boundaries.

---

## 1. The 5-Step LLD Execution Framework

```
Clarify Requirements (3-5m) ──► Identify Core Entities (5m) ──► Design Class Structure (10-15m)
                                                                        │
Discuss Trade-Offs (5m) ◄──────────────── Implement Key Methods (15-25m) ◄┘
```

---

## Step 1: Clarify Requirements (3–5 Mins)

Do not type a line of code until scope is rigidly bounded:
1. **Functional Boundaries**: What operations are strictly supported?
   - *"For this Parking Lot system, we will support Vehicle Entry, Spot Assignment by vehicle size, Vehicle Exit, and Hourly Fare Calculation. Monthly subscriptions and EV charging reservations are marked out of scope."*
2. **Execution Model**: Clarify whether the interviewer expects:
   - A **Discrete In-Memory Simulation** driven by a single-threaded CLI `main()` runner.
   - Or a **Concurrent Multi-Threaded Engine** with active worker pools, locks, and thread safety.

---

## Step 2: Identify Core Entities (5 Mins)

Extract nouns from the problem statement. Distinguish core domain entities from secondary attributes:

```
Domain Nouns:
- ParkingLot (Top-level Facade)
- ParkingFloor (Container of spots)
- ParkingSpot (Base entity: Compact, Large, Handicap, Motorcycle)
- Vehicle (License plate, VehicleType enum)
- Ticket (Unique ticket ID, entry timestamp, spot reference)
- Payment (PaymentStatus, PaymentMethod, FareStrategy)
```

**Rule**: Keep primitive attributes unencapsulated initially. Focus on domain identity.

---

## Step 3: Design Class Structure & Interfaces (10–15 Mins)

Define the contract between entities before implementing internal method logic:

```java
// Strategy for extensible pricing
public interface FareStrategy {
    BigDecimal calculateFare(Ticket ticket, Instant exitTime);
}

// Strategy for spot allocation (Nearest vs Best-Fit)
public interface SpotAllocationStrategy {
    Optional<ParkingSpot> findAvailableSpot(List<ParkingFloor> floors, VehicleType type);
}
```

- **Favor Composition Over Inheritance**: Avoid deep 6-level inheritance trees (`Vehicle -> LandVehicle -> MotorVehicle -> FourWheeler...`). Use simple enums or composition.
- **Single Responsibility Principle**: A `ParkingSpot` should not calculate monetary currency conversions. Delegate pricing to a dedicated `FareCalculator`.

---

## Step 4: Implement Key Methods (15–25 Mins)

Focus 100% of your energy on the **primary operational paths**:
1. How a vehicle enters and acquires a spot.
2. How a vehicle exits, releases the spot, and pays.

Write clean, idiomatic code with proper defensive checks:
- Validate nulls and empty values.
- Protect shared collections with concurrent structures (`ConcurrentHashMap`, `ReentrantLock`).
- Keep method bodies concise and readable.

---

## Step 5: Discuss Trade-Offs & Complexity (5 Mins)

Conclude by articulating time/space complexities and operational bottlenecks:
- *"Spot lookup runs in $O(1)$ time by maintaining a bidirectional `ConcurrentHashMap<Vehicle, ParkingSpot>`. Memory complexity is $O(N)$ where $N$ is total capacity."*
- *"If thousands of cars enter simultaneously, lock contention on `findAvailableSpot()` can be mitigated by partitioning spot pools per floor or using lock-free atomic bitsets."*
