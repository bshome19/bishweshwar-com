---
id: mc-elevator-dispatch-system
title: "Machine Coding Case Study: Elevator Control & Dispatch Simulation"
track: machine-coding
module: case-studies
level: advanced
duration: 45
prerequisites: [lld-five-step-framework, mc-parking-lot-system]
concepts: [elevator, scan-algorithm, state-pattern, scheduling, multi-threading, machine-coding]
tags: [machine-coding, lld, algorithms, scan, scheduling]
order: 2
---

# Machine Coding: Elevator Control & Dispatch Simulation

Designing an **Elevator Control System** requires combining object-oriented modeling with algorithmic scheduling. You must coordinate multiple elevator cars, handle internal destination presses and external floor hall calls, and optimize passenger wait times using the **SCAN (Elevator) Algorithm**.

---

## 1. Requirements & Problem Decomposition

1. **System Topology**: A building with $N$ floors (e.g. 1 to 20) and $M$ independent elevator cars.
2. **Request Types**:
   - **External Hall Call**: A passenger at Floor 7 presses the `UP` button.
   - **Internal Car Request**: A passenger inside Car 2 presses Floor 15.
3. **Dispatch Optimization**: When a hall call arrives, the system must assign the most optimal elevator car to minimize total passenger wait time.
4. **Safety & Weight**: Track car state (`IDLE`, `MOVING_UP`, `MOVING_DOWN`), capacity limits, and door sensors (`OPEN`, `CLOSING`, `CLOSED`).

---

## 2. The Core Algorithm: The SCAN (LOOK) Scheduling Algorithm

The most efficient algorithm for operating a real-world elevator car is the **SCAN (or LOOK) Algorithm**:

```
Current Floor: 4, Direction: UP

Pending Requests:
- Above current floor: [Floor 7, Floor 10] ──► Sorted Ascending:  7, 10
- Below current floor: [Floor 2, Floor 1]  ──► Sorted Descending: 2, 1

Execution Flow:
1. Sweep UP: 4 ──► 7 ──► 10
2. When no more requests remain ahead in UP direction:
3. Reverse direction to DOWN
4. Sweep DOWN: 10 ──► 2 ──► 1
```

### Why SCAN Beats Simple First-Come-First-Served (FCFS)
If Elevator Car 1 uses naive FCFS:
- Car is at Floor 1.
- Passenger A requests Floor 20. Car moves to 20.
- Passenger B requests Floor 2. Car moves back to 2.
- Passenger C requests Floor 19. Car moves back to 19.
- Passengers spend 15 minutes traveling up and down while energy consumption skyrockets.
- **SCAN guarantees that an elevator sweeps continuously in one direction, fulfilling all intermediate stops before reversing.**

---

## 3. Data Structures for SCAN Implementation

```java
public class ElevatorCar {
    private final int id;
    private int currentFloor = 1;
    private Direction currentDirection = Direction.IDLE;
    private ElevatorState state = ElevatorState.STOPPED;

    // Stops needed while traveling UP (Min-Heap / TreeSet sorted Ascending)
    private final TreeSet<Integer> upStops = new TreeSet<>();

    // Stops needed while traveling DOWN (Max-Heap / TreeSet sorted Descending)
    private final TreeSet<Integer> downStops = new TreeSet<>((a, b) -> b - a);

    public synchronized void addDestination(int floor) {
        if (floor > currentFloor) {
            upStops.add(floor);
        } else if (floor < currentFloor) {
            downStops.add(floor);
        }
        if (currentDirection == Direction.IDLE) {
            currentDirection = floor >= currentFloor ? Direction.UP : Direction.DOWN;
        }
    }

    public synchronized void step() {
        if (currentDirection == Direction.UP) {
            if (!upStops.isEmpty()) {
                currentFloor = upStops.pollFirst();
                openDoors();
            } else if (!downStops.isEmpty()) {
                currentDirection = Direction.DOWN;
                currentFloor = downStops.pollFirst();
                openDoors();
            } else {
                currentDirection = Direction.IDLE;
            }
        } else if (currentDirection == Direction.DOWN) {
            if (!downStops.isEmpty()) {
                currentFloor = downStops.pollFirst();
                openDoors();
            } else if (!upStops.isEmpty()) {
                currentDirection = Direction.UP;
                currentFloor = upStops.pollFirst();
                openDoors();
            } else {
                currentDirection = Direction.IDLE;
            }
        }
    }
}
```

---

## 4. Multi-Car Dispatcher Strategy

When an external user at Floor $F$ presses `UP`, which elevator car should respond?

The `ElevatorController` scores each car:
1. **Best Candidate**: A car currently moving towards Floor $F$ in the same direction (`UP`) and currently below Floor $F$ (Distance = $F - \text{car.floor}$).
2. **Second Best**: An `IDLE` car (Distance = $|F - \text{car.floor}|$).
3. **Worst Candidate**: A car moving away or in the opposite direction (must complete its current sweep before reversing).
