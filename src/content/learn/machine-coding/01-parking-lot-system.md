---
id: mc-parking-lot-system
title: "Machine Coding Case Study: Multi-Floor Parking Lot System"
track: machine-coding
module: case-studies
level: intermediate
duration: 45
prerequisites: [lld-five-step-framework, pattern-strategy]
concepts: [parking-lot, facade, strategy-pattern, concurrency, machine-coding, class-hierarchy]
tags: [machine-coding, lld, oop, case-study, interviews]
order: 1
---

# Machine Coding: Multi-Floor Parking Lot System

The **Parking Lot System** is the quintessential benchmark problem in machine coding interviews. It evaluates your ability to model real-world physical constraints, design clean entity hierarchies, use design patterns (Facade, Strategy), and write thread-safe concurrent lookups.

---

## 1. Problem Statement & Functional Requirements

Design an in-memory management system for a multi-floor parking structure:
1. **Multi-Floor Structure**: The lot consists of $F$ floors, each with $S$ parking spots.
2. **Vehicle & Spot Types**:
   - `Motorcycle` $\rightarrow$ Can park in `MotorcycleSpot`, `CompactSpot`, or `LargeSpot`.
   - `Car` $\rightarrow$ Can park in `CompactSpot` or `LargeSpot`.
   - `Truck / Bus` $\rightarrow$ Can only park in `LargeSpot`.
3. **Vehicle Entry**: System assigns the nearest available spot, marks it occupied, and issues an entry `Ticket`.
4. **Vehicle Exit**: System takes the ticket, calculates the fee based on duration and vehicle type, marks the spot available, and processes payment.
5. **Real-Time Display**: Display available spots per vehicle type for each floor.

---

## 2. Core Entity Architecture & Class Design

```
┌────────────────────────────────────────────────────────┐
│             ParkingLot (Unified Facade)                │
├────────────────────────────────────────────────────────┤
│ - floors: List<ParkingFloor>                           │
│ - activeTickets: ConcurrentMap<String, Ticket>         │
│ - vehicleToSpot: ConcurrentMap<Vehicle, ParkingSpot>   │
│ - spotStrategy: SpotAssignmentStrategy                 │
│ - fareStrategy: FareCalculationStrategy                │
└──────────────────────────┬─────────────────────────────┘
                           │ 1..*
                           ▼
┌────────────────────────────────────────────────────────┐
│                     ParkingFloor                       │
├────────────────────────────────────────────────────────┤
│ - floorNumber: int                                     │
│ - spots: List<ParkingSpot>                             │
│ - availableSpotsByType: Map<SpotType, AtomicInteger>   │
└────────────────────────────────────────────────────────┘
```

---

## 3. High-Performance $O(1)$ Spot Allocation Strategy

A naive implementation loops through every floor and every spot ($O(F \times S)$ time complexity):

```java
// OPTIMAL: PriorityQueue or Dedicated Free-List per Spot Type
public class NearestSpotAssignmentStrategy implements SpotAssignmentStrategy {
    // Maps each SpotType to a min-heap sorted by (floorNumber, spotNumber)
    private final Map<SpotType, PriorityQueue<ParkingSpot>> freeSpots = new ConcurrentHashMap<>();

    @Override
    public synchronized Optional<ParkingSpot> findSpot(Vehicle vehicle) {
        SpotType requiredType = mapVehicleToMinimumSpotType(vehicle.getType());
        PriorityQueue<ParkingSpot> pq = freeSpots.get(requiredType);
        
        if (pq == null || pq.isEmpty()) {
            return Optional.empty(); // Floor full!
        }
        ParkingSpot spot = pq.poll(); // O(log N) optimal assignment
        spot.occupy(vehicle);
        return Optional.of(spot);
    }
}
```

---

## 4. Extensible Pricing Strategy (Strategy Pattern)

```java
public interface FareCalculationStrategy {
    BigDecimal calculateFare(Ticket ticket, Instant exitTime);
}

public class HourlyWithVehicleMultiplierFareStrategy implements FareCalculationStrategy {
    private static final BigDecimal BASE_HOURLY_RATE = new BigDecimal("20.00");

    @Override
    public BigDecimal calculateFare(Ticket ticket, Instant exitTime) {
        long hours = Duration.between(ticket.getEntryTime(), exitTime).toHours();
        if (hours == 0) hours = 1; // Minimum 1-hour charge

        BigDecimal rate = BASE_HOURLY_RATE.multiply(BigDecimal.valueOf(hours));
        return rate.multiply(ticket.getVehicle().getType().getFareMultiplier());
    }
}
```

---

## 5. Concurrency & Thread Safety Considerations
- **Race Condition on Last Spot**: If two cars enter Floor 1 simultaneously with only 1 compact spot remaining, both threads might try to claim the spot.
- **Solution**: Use `synchronized` methods, `ReentrantLock`, or an atomic state transition: `spot.isOccupied.compareAndSet(false, true)`.
- **Bidirectional Mappings**: Store active allocations in `ConcurrentHashMap<String, Ticket>` and `ConcurrentHashMap<Vehicle, ParkingSpot>` for instant $O(1)$ lookups during vehicle exit.
