---
title: "Quantum Genetic Algorithm for Knapsack Optimization"
description: "Implementation of a Quantum Genetic Algorithm (QGA) combining qubit chromosome representations and quantum rotation gates to solve the NP-hard 0-1 Knapsack problem."
status: "completed"
technologies: ["Python", "Quantum Computing", "Evolutionary Algorithms", "Combinatorial Optimization", "NumPy"]
github: "https://github.com/bshome19"
featured: true
category: "Quantum Computing"
metrics: [
  "Linear superposition qubit chromosomes",
  "Quantum rotation gate operator U(Δθ)",
  "Significant population reduction vs classical GA",
  "Higher resistance to local deceptive extrema"
]
order: 2
---

## Overview

The **0-1 Knapsack Problem** is a canonical NP-hard combinatorial optimization challenge: select a subset of $n$ items with associated weights and values such that total value is maximized without exceeding capacity $W$.

This project implements a **Quantum-Inspired Genetic Algorithm (QGA)** in Python, fusing the probabilistic superposition properties of qubits with evolutionary search mechanics.

## Architecture & Principles

### Qubit Chromosome Encoding
Each chromosome consists of $n$ qubits. Each qubit state is represented by a pair of complex probability amplitudes $(\alpha_i, \beta_i)$:

$$|\psi_i\rangle = \alpha_i |0\rangle + \beta_i |1\rangle, \quad |\alpha_i|^2 + |\beta_i|^2 = 1$$

A chromosome with $n$ qubits simultaneously embodies $2^n$ configurations before measurement, giving the algorithm implicit quantum parallelism.

### Quantum Rotation Gate Operator
Rather than relying on disruptive classical crossover operators, the population evolves using a **Quantum Rotation Gate**:

$$\begin{bmatrix} \alpha_i' \\ \beta_i' \end{bmatrix} = \begin{bmatrix} \cos(\Delta \theta_i) & -\sin(\Delta \theta_i) \\ \sin(\Delta \theta_i) & \cos(\Delta \theta_i) \end{bmatrix} \begin{bmatrix} \alpha_i \\ \beta_i \end{bmatrix}$$

The rotation step $\Delta \theta$ directs the qubit amplitude vector toward the currently discovered global best individual, while retaining sufficient quantum uncertainty to avoid premature convergence.

## Key Outcomes

- Reduced required population size by over 80% compared to standard binary genetic algorithms.
- Avoided trap states in non-convex fitness landscapes through probabilistic superposition sampling.
- Laid the mathematical groundwork for porting evolutionary optimization to real quantum hardware simulators.
