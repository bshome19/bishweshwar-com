---
title: "Quantum Genetic Algorithm (QGA) Simulator"
description: "Simulating qubit superposition states, probability amplitude rotations, and quantum-inspired evolutionary search to solve NP-hard Knapsack problems."
category: "quantum"
status: "active"
technologies: ["Python", "Quantum Superposition", "Qubits", "Rotation Gates", "NumPy"]
github: "https://github.com/bshome19"
featured: true
order: 2
---

## 1. Overview

Quantum Genetic Algorithms (QGA) apply quantum computational principles — specifically **qubit superposition** and **unitary rotation gates** — to evolutionary optimization on classical architectures.

This lab explores how a population of quantum chromosomes searches multi-dimensional solution spaces with higher diversity and faster convergence than standard bitstring genetic algorithms.

---

## 2. The Problem: Combinatorial Explosion

In the 0-1 Knapsack problem, selecting from $n$ candidate items presents a search space of $2^n$ combinations. For $n = 50$, the state space contains over $10^{15}$ configurations. Classical genetic algorithms frequently get trapped in deceptive local optima because binary crossover destroys beneficial allele combinations (the Hamming cliff problem).

---

## 3. Quantum Mechanics Theory

### Qubit State Vector
A qubit state $|\psi\rangle$ exists in a continuous linear superposition of the basis vectors $|0\rangle$ and $|1\rangle$:

$$|\psi\rangle = \alpha |0\rangle + \beta |1\rangle$$

where $|\alpha|^2$ and $|\beta|^2$ represent the probability of observing $|0\rangle$ and $|1\rangle$, constrained by:

$$|\alpha|^2 + |\beta|^2 = 1$$

In polar coordinates:

$$\alpha = \cos(\theta), \quad \beta = \sin(\theta)$$

### Quantum Rotation Gate
To evolve the quantum chromosome toward optimal configurations, we apply a rotation gate matrix $U(\Delta \theta)$:

$$\begin{bmatrix} \alpha' \\ \beta' \end{bmatrix} = \begin{bmatrix} \cos(\Delta \theta) & -\sin(\Delta \theta) \\ \sin(\Delta \theta) & \cos(\Delta \theta) \end{bmatrix} \begin{bmatrix} \alpha \\ \beta \end{bmatrix} = \begin{bmatrix} \cos(\theta + \Delta \theta) \\ \sin(\theta + \Delta \theta) \end{bmatrix}$$

---

## 4. Architecture & Simulation Loop

```
┌────────────────────────────────────────────────────────┐
│           Initialize Quantum Chromosome Pop            │
│                 (All qubits α = β = 1/√2)              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         Probabilistic Collapse & Measurement           │
│        (Generate classical bitstrings X via |β|²)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Evaluate Knapsack Fitness f(X)             │
│            (Track global best individual B)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│         Update Amplitudes via Rotation Gates           │
│        (Rotate toward best state B by angle Δθ)        │
└───────────────────────────┬────────────────────────────┘
                            │ Repeat until convergence
                            ▼
```

---

## 5. Python Implementation Snippet

```python
import numpy as np

class QuantumChromosome:
    def __init__(self, num_qubits: int):
        # Initialize each qubit in equal superposition: |α|² = |β|² = 0.5
        self.num_qubits = num_qubits
        self.alpha = np.full(num_qubits, 1.0 / np.sqrt(2))
        self.beta = np.full(num_qubits, 1.0 / np.sqrt(2))

    def measure(self) -> np.ndarray:
        """Collapse qubits into classical binary bits based on |β|² probability."""
        probs = self.beta ** 2
        rand = np.random.random(self.num_qubits)
        return (rand < probs).astype(int)

    def rotate(self, delta_theta: np.ndarray):
        """Apply unitary rotation gate U(Δθ) to all qubits."""
        cos_dt = np.cos(delta_theta)
        sin_dt = np.sin(delta_theta)

        new_alpha = cos_dt * self.alpha - sin_dt * self.beta
        new_beta = sin_dt * self.alpha + cos_dt * self.beta

        self.alpha, self.beta = new_alpha, new_beta
```

---

## 6. What I Learned

- Quantum representation allows a tiny population ($N = 10$) to maintain the genetic diversity of a classical population ten times its size.
- Dynamic rotation angle scheduling ($\Delta \theta$ decaying from $0.05\pi$ to $0.005\pi$) prevents oscillations around global optima.
- Provides a bridge toward native gate programming for NISQ (Noisy Intermediate-Scale Quantum) devices.
