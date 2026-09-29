---
id: machine-coding-elevator
title: "Building an Elevator Dispatch System"
track: machine-coding
module: state-machines
level: advanced
duration: 35
prerequisites: [machine-coding-parking-lot]
concepts: [state-machine, scheduling-algorithm, scan-algorithm, event-loop, concurrency]
tags: [advanced, machine-coding, elevator, state-machine, scheduling]
interactive:
  type: code-playground
  enabled: true
order: 2
---

# Building an Elevator Dispatch System

An elevator system is a beautiful engineering problem because it looks trivial until you start thinking about it. One elevator, one button? Easy. Six elevators, 40 floors, hundreds of people, and the constraint that nobody should wait more than 60 seconds? That's a real optimization problem.

This exercise forces you to model concurrent state machines — each elevator is an independent machine with its own state, moving between floors, opening and closing doors. The dispatcher must coordinate them intelligently.

---

## The Requirements

- A building has N floors and M elevators
- Each floor has up/down call buttons
- Each elevator has floor-selection buttons inside
- The system should minimize average wait time
- Multiple elevators can move simultaneously

---

## The Core Entities

```python
from enum import Enum
from dataclasses import dataclass, field
from threading import Lock
from collections import deque

class Direction(Enum):
    UP = "up"
    DOWN = "down"
    IDLE = "idle"

class DoorState(Enum):
    OPEN = "open"
    CLOSED = "closed"

@dataclass
class ElevatorState:
    id: int
    current_floor: int = 1
    direction: Direction = Direction.IDLE
    door: DoorState = DoorState.CLOSED
    destinations: set[int] = field(default_factory=set)
    
    @property
    def is_idle(self):
        return self.direction == Direction.IDLE and not self.destinations

@dataclass
class FloorRequest:
    floor: int
    direction: Direction  # Which way the person wants to go
```

---

## The SCAN Algorithm

The simplest effective elevator algorithm is **SCAN** (also called the elevator algorithm, because... it's how elevators work):

1. Move in one direction, stopping at all requested floors along the way
2. When there are no more requests in the current direction, reverse
3. Continue sweeping back and forth

This is the same algorithm used by disk schedulers to optimize read head movement — which is why it's called the "elevator algorithm" in operating systems textbooks.

```python
class Elevator:
    def __init__(self, elevator_id: int, total_floors: int):
        self.state = ElevatorState(id=elevator_id)
        self.total_floors = total_floors
        self.lock = Lock()
    
    def add_destination(self, floor: int):
        with self.lock:
            self.state.destinations.add(floor)
            if self.state.is_idle:
                if floor > self.state.current_floor:
                    self.state.direction = Direction.UP
                elif floor < self.state.current_floor:
                    self.state.direction = Direction.DOWN
    
    def step(self) -> str:
        """Advance the elevator by one time step. Returns action taken."""
        with self.lock:
            if not self.state.destinations:
                self.state.direction = Direction.IDLE
                return f"Elevator {self.state.id}: idle at floor {self.state.current_floor}"
            
            if self.state.current_floor in self.state.destinations:
                self.state.destinations.discard(self.state.current_floor)
                return f"Elevator {self.state.id}: stopped at floor {self.state.current_floor}"
            
            # SCAN: continue in current direction if there are destinations ahead
            if self.state.direction == Direction.UP:
                if any(f > self.state.current_floor for f in self.state.destinations):
                    self.state.current_floor += 1
                else:
                    self.state.direction = Direction.DOWN
                    self.state.current_floor -= 1
            elif self.state.direction == Direction.DOWN:
                if any(f < self.state.current_floor for f in self.state.destinations):
                    self.state.current_floor -= 1
                else:
                    self.state.direction = Direction.UP
                    self.state.current_floor += 1
            
            return f"Elevator {self.state.id}: moving to floor {self.state.current_floor}"
```

---

## The Dispatcher: Choosing Which Elevator Responds

When someone presses the "up" button on floor 7, which elevator should respond?

The simplest effective strategy: **nearest elevator in the same direction, or any idle elevator**.

```python
class ElevatorDispatcher:
    def __init__(self, elevators: list[Elevator]):
        self.elevators = elevators
    
    def dispatch(self, request: FloorRequest) -> Elevator:
        best = None
        best_cost = float('inf')
        
        for elevator in self.elevators:
            cost = self._calculate_cost(elevator, request)
            if cost < best_cost:
                best_cost = cost
                best = elevator
        
        if best:
            best.add_destination(request.floor)
        return best
    
    def _calculate_cost(self, elevator: Elevator, request: FloorRequest) -> int:
        state = elevator.state
        distance = abs(state.current_floor - request.floor)
        
        if state.is_idle:
            return distance  # Just the travel distance
        
        # Elevator moving in same direction as request, and hasn't passed the floor yet
        if state.direction == request.direction:
            if (state.direction == Direction.UP and state.current_floor <= request.floor) or \
               (state.direction == Direction.DOWN and state.current_floor >= request.floor):
                return distance  # On the way, cheap
        
        # Elevator going the wrong way: it'll have to reverse first
        return distance + elevator.total_floors  # Penalize significantly
```

This is a greedy algorithm — it picks the locally optimal elevator for each request. More sophisticated dispatchers use look-ahead algorithms that consider future requests, but the greedy approach works well in practice.

---

## Key Design Insights

1. **State machine per elevator**: Each elevator is an independent state machine with its own direction, position, and queue. The dispatcher coordinates between them.

2. **SCAN algorithm**: Simple, fair, and efficient — it minimizes unnecessary direction changes.

3. **Thread safety**: Each elevator has its own lock. The dispatcher can query elevator states without blocking other elevators.

4. **Strategy for dispatch**: The cost function is the strategy. You can swap it for a more sophisticated algorithm without changing the elevator logic.

This exercise demonstrates how complex behavior emerges from simple rules. Each elevator follows a simple SCAN policy. The dispatcher assigns requests using a simple cost function. Together, they handle complex multi-elevator coordination.
