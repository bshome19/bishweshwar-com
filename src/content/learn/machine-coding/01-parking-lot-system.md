---
id: machine-coding-parking-lot
title: "Building a Parking Lot System from Scratch"
track: machine-coding
module: oop-implementation
level: advanced
duration: 35
prerequisites: [lld-framework, lld-solid-principles]
concepts: [domain-modeling, strategy-pattern, composition, thread-safety, concurrent-access]
tags: [advanced, machine-coding, parking-lot, oop, implementation]
interactive:
  type: code-playground
  enabled: true
order: 1
---

# Building a Parking Lot System from Scratch

This is a hands-on design exercise. We'll take a seemingly simple problem — managing a parking lot — and discover how many interesting design decisions hide inside it.

The goal isn't to produce a "correct answer." It's to practice the skill of going from vague requirements to working, well-structured code, discovering the hard parts as they naturally emerge.

---

## The Requirements (Deliberately Vague)

Design a parking lot management system that:
- Has multiple floors, each with many parking spots
- Supports different vehicle types (motorcycle, car, truck)
- Assigns vehicles to appropriately sized spots
- Tracks entry and exit times
- Calculates parking fees

That's it. Real requirements are always vague. Part of the skill is asking the right clarifying questions.

---

## Clarifying Questions (That Change the Design)

Before coding, these questions reveal hidden complexity:

**Q: Can a truck park across multiple spots?**
If yes: spots aren't independent — you need to track contiguous spot groups. Much more complex.
If no: each vehicle occupies exactly one spot. Simpler.
*We'll assume no — one vehicle, one spot.*

**Q: Is the system multi-threaded? Can two vehicles enter simultaneously?**
If yes: we need thread-safe spot assignment. Two threads checking "is spot 42 free?" simultaneously could assign the same spot to two cars.
*Yes — concurrent access is realistic.*

**Q: Is pricing per hour, per day, or dynamic?**
Different pricing models = different algorithms = Strategy pattern.
*We'll support multiple pricing strategies.*

**Q: Do we need to persist data across restarts?**
If yes: we need a database layer.
If no: in-memory is fine.
*We'll design the interface so persistence can be added later, but implement in-memory.*

---

## The Domain Model

From our requirements, the core entities:

```python
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
from typing import Optional
import uuid

class VehicleType(Enum):
    MOTORCYCLE = "motorcycle"
    CAR = "car"
    TRUCK = "truck"

class SpotSize(Enum):
    COMPACT = "compact"
    REGULAR = "regular"
    LARGE = "large"

# Which vehicle types fit in which spot sizes
SPOT_COMPATIBILITY = {
    VehicleType.MOTORCYCLE: [SpotSize.COMPACT, SpotSize.REGULAR, SpotSize.LARGE],
    VehicleType.CAR: [SpotSize.REGULAR, SpotSize.LARGE],
    VehicleType.TRUCK: [SpotSize.LARGE],
}

@dataclass
class Vehicle:
    license_plate: str
    vehicle_type: VehicleType

@dataclass
class ParkingSpot:
    id: str
    floor: int
    size: SpotSize
    vehicle: Optional[Vehicle] = None
    
    @property
    def is_available(self) -> bool:
        return self.vehicle is None
    
    def can_fit(self, vehicle: Vehicle) -> bool:
        return self.size in SPOT_COMPATIBILITY[vehicle.vehicle_type]
    
    def park(self, vehicle: Vehicle):
        if not self.is_available:
            raise ValueError(f"Spot {self.id} is already occupied")
        if not self.can_fit(vehicle):
            raise ValueError(f"Vehicle {vehicle.vehicle_type} doesn't fit in {self.size} spot")
        self.vehicle = vehicle
    
    def vacate(self) -> Vehicle:
        if self.is_available:
            raise ValueError(f"Spot {self.id} is already empty")
        vehicle = self.vehicle
        self.vehicle = None
        return vehicle
```

Notice: `ParkingSpot` doesn't know about fees, tickets, or the parking lot. It only knows about spots and vehicles. Single responsibility.

---

## The Ticket and Fee System

```python
@dataclass
class ParkingTicket:
    id: str
    vehicle: Vehicle
    spot: ParkingSpot
    entry_time: datetime
    exit_time: Optional[datetime] = None
    fee: Optional[float] = None

class FeeStrategy:
    """Abstract fee calculation strategy."""
    def calculate(self, entry_time: datetime, exit_time: datetime, 
                  vehicle_type: VehicleType) -> float:
        raise NotImplementedError

class HourlyFeeStrategy(FeeStrategy):
    def __init__(self, rates: dict[VehicleType, float]):
        self.rates = rates  # e.g., {CAR: 10.0, TRUCK: 15.0, MOTORCYCLE: 5.0}
    
    def calculate(self, entry_time, exit_time, vehicle_type):
        duration_hours = (exit_time - entry_time).total_seconds() / 3600
        hours_charged = max(1, int(duration_hours) + (1 if duration_hours % 1 > 0 else 0))
        return hours_charged * self.rates[vehicle_type]

class FlatRateFeeStrategy(FeeStrategy):
    def __init__(self, daily_rate: float):
        self.daily_rate = daily_rate
    
    def calculate(self, entry_time, exit_time, vehicle_type):
        days = max(1, (exit_time - entry_time).days + 1)
        return days * self.daily_rate
```

The Strategy pattern here isn't over-engineering — it's the natural way to support multiple pricing models without modifying the parking lot code.

---

## The Parking Lot: Thread-Safe Coordination

```python
class ParkingLot:
    def __init__(self, spots: list[ParkingSpot], fee_strategy: FeeStrategy):
        self.spots = spots
        self.fee_strategy = fee_strategy
        self.active_tickets: dict[str, ParkingTicket] = {}  # license_plate → ticket
        self.lock = Lock()
    
    def park(self, vehicle: Vehicle) -> ParkingTicket:
        with self.lock:
            # Check if vehicle is already parked
            if vehicle.license_plate in self.active_tickets:
                raise ValueError(f"Vehicle {vehicle.license_plate} is already parked")
            
            # Find an available spot
            spot = self._find_available_spot(vehicle)
            if spot is None:
                raise ValueError(f"No available spot for {vehicle.vehicle_type.value}")
            
            # Park the vehicle
            spot.park(vehicle)
            
            # Issue ticket
            ticket = ParkingTicket(
                id=str(uuid.uuid4()),
                vehicle=vehicle,
                spot=spot,
                entry_time=datetime.now()
            )
            self.active_tickets[vehicle.license_plate] = ticket
            return ticket
    
    def exit(self, license_plate: str) -> ParkingTicket:
        with self.lock:
            ticket = self.active_tickets.get(license_plate)
            if ticket is None:
                raise ValueError(f"No active ticket for {license_plate}")
            
            # Calculate fee
            ticket.exit_time = datetime.now()
            ticket.fee = self.fee_strategy.calculate(
                ticket.entry_time, ticket.exit_time, ticket.vehicle.vehicle_type
            )
            
            # Vacate spot
            ticket.spot.vacate()
            del self.active_tickets[license_plate]
            
            return ticket
    
    def _find_available_spot(self, vehicle: Vehicle) -> Optional[ParkingSpot]:
        """Find the smallest available spot that fits the vehicle."""
        compatible = [s for s in self.spots if s.is_available and s.can_fit(vehicle)]
        if not compatible:
            return None
        # Prefer the smallest fitting spot (to save large spots for large vehicles)
        size_order = {SpotSize.COMPACT: 0, SpotSize.REGULAR: 1, SpotSize.LARGE: 2}
        compatible.sort(key=lambda s: (size_order[s.size], s.floor))
        return compatible[0]
    
    def available_spots(self) -> dict[SpotSize, int]:
        counts = {size: 0 for size in SpotSize}
        for spot in self.spots:
            if spot.is_available:
                counts[spot.size] += 1
        return counts
```

**Key design decisions**:

1. **Thread safety via Lock**: The `park()` and `exit()` methods acquire a lock to prevent race conditions. Two threads can't simultaneously assign the same spot.

2. **Smallest-fit-first allocation**: We assign the smallest available spot that fits the vehicle. This prevents cars from taking up large spots that trucks need.

3. **Separation of concerns**: ParkingLot coordinates, ParkingSpot manages individual spots, FeeStrategy calculates fees. Each can be tested independently.

---

## Using the System

```python
# Create a parking lot
spots = []
for floor in range(1, 4):
    for i in range(20):
        size = SpotSize.COMPACT if i < 5 else SpotSize.REGULAR if i < 15 else SpotSize.LARGE
        spots.append(ParkingSpot(id=f"F{floor}-S{i+1}", floor=floor, size=size))

fee_strategy = HourlyFeeStrategy({
    VehicleType.MOTORCYCLE: 5.0,
    VehicleType.CAR: 10.0,
    VehicleType.TRUCK: 15.0,
})

lot = ParkingLot(spots, fee_strategy)

# Park a car
car = Vehicle("ABC-123", VehicleType.CAR)
ticket = lot.park(car)
print(f"Parked at {ticket.spot.id} on floor {ticket.spot.floor}")

# Later: exit
completed_ticket = lot.exit("ABC-123")
print(f"Fee: ${completed_ticket.fee}")
print(f"Available spots: {lot.available_spots()}")
```

---

## What We Learned

This exercise demonstrates several design principles in action:

- **Domain modeling first**: The entities (Vehicle, Spot, Ticket) came from the problem domain, not from technical concerns
- **Strategy pattern**: Fee calculation is swappable without modifying ParkingLot
- **Thread safety**: The Lock prevents race conditions in concurrent scenarios
- **Composition over inheritance**: Vehicle types are data (an enum), not class hierarchies
- **Testability**: Each component can be tested independently with injected dependencies

The next exercises build on these same principles with progressively more complex systems.
