---
title: "Quantum Genetic Algorithm for Combinatorial Optimization"
description: "Exploring Quantum Genetic Algorithms (QGA): leveraging qubit chromosome representations and quantum rotation gates to solve the NP-hard 0-1 Knapsack problem."
pubDate: 2023-11-10
category: "quantum"
tags: ["quantum-computing", "algorithms", "optimization", "evolutionary-computing", "python"]
featured: true
canonicalUrl: "https://bishweshwar.com/blog/quantum-genetic-algorithm-knapsack"
readingTime: "8 min read"
---

Combinatorial optimization problems, such as the classic **0-1 Knapsack Problem**, are fundamental to computer science and operational research. In the 0-1 Knapsack problem, given a set of items with distinct weights and values, the goal is to determine the subset of items that maximizes total value without exceeding a strict knapsack weight capacity $W$.

Because the problem is **NP-hard**, exhaustive brute-force search requires $\mathcal{O}(2^n)$ evaluations, which becomes computationally intractable as $n$ grows.

During my Master of Computer Science at Visva-Bharati University, I focused on exploring **Quantum Genetic Algorithms (QGA)** — hybrid algorithms that fuse the principles of quantum mechanics (superposition and quantum gate operations) with evolutionary algorithms to search massive discrete solution spaces efficiently.

---

## 1. Classical vs. Quantum Genetic Representation

In classical Genetic Algorithms (GA), a candidate solution (chromosome) is encoded as a binary bitstring:

$$C_{\text{classical}} = [x_1, x_2, \dots, x_n], \quad x_i \in \{0, 1\}$$

A population of $M$ classical chromosomes can represent at most $M$ distinct states at any given generation.

In **Quantum Genetic Algorithms**, a chromosome is composed of $n$ **quantum bits (qubits)**. A single qubit state $|\psi\rangle$ is defined as a linear superposition of the basis states $|0\rangle$ and $|1\rangle$:

$$|\psi\rangle = \alpha |0\rangle + \beta |1\rangle$$

where $\alpha, \beta \in \mathbb{C}$ are probability amplitudes satisfying the normalization condition:

$$|\alpha|^2 + |\beta|^2 = 1$$

Here, $|\alpha|^2$ represents the probability that the qubit collapses into state $|0\rangle$, and $|\beta|^2$ represents the probability that it collapses into state $|1\rangle$.

### The Quantum Chromosome Matrix

A quantum chromosome $q_j$ of length $n$ is represented as a $2 \times n$ matrix:

$$q_j = \begin{bmatrix} \alpha_1 & \alpha_2 & \dots & \alpha_n \\ \beta_1 & \beta_2 & \dots & \beta_n \end{bmatrix}$$

Because every individual qubit exists in a superposition of both $|0\rangle$ and $|1\rangle$, a single quantum chromosome represents **all $2^n$ potential states simultaneously**. This provides exceptional population diversity with a drastically smaller population size than classical GAs.

---

## 2. Solution Measurement (State Collapse)

To evaluate the fitness of a quantum chromosome in the physical problem domain, we must measure (observe) each qubit. 

For each qubit $i$ with amplitude $(\alpha_i, \beta_i)$:
1. Generate a pseudo-random number $r \sim \mathcal{U}(0, 1)$.
2. If $r > |\alpha_i|^2$, then $x_i = 1$ (item included in knapsack).
3. Otherwise, $x_i = 0$ (item excluded).

The collapsed binary string $X = [x_1, x_2, \dots, x_n]$ is then evaluated using the Knapsack objective function:

$$f(X) = \begin{cases} \sum_{i=1}^n v_i x_i, & \text{if } \sum_{i=1}^n w_i x_i \le W \\ 0, & \text{otherwise} \end{cases}$$

---

## 3. Quantum Rotation Gate Evolution

Rather than using classical crossover and mutation operators which can cause premature convergence or disrupt schema, QGA updates probability amplitudes using **Quantum Rotation Gates** $U(\Delta \theta)$:

$$\begin{bmatrix} \alpha_i' \\ \beta_i' \end{bmatrix} = U(\Delta \theta_i) \begin{bmatrix} \alpha_i \\ \beta_i \end{bmatrix} = \begin{bmatrix} \cos(\Delta \theta_i) & -\sin(\Delta \theta_i) \\ \sin(\Delta \theta_i) & \cos(\Delta \theta_i) \end{bmatrix} \begin{bmatrix} \alpha_i \\ \beta_i \end{bmatrix}$$

The rotation angle $\Delta \theta_i$ is determined by a lookup strategy that compares:
- The current bit $x_i$
- The best-known global bit $b_i$
- Whether the current fitness is greater or less than the best-known fitness

```
If x_i == 0 and b_i == 1 and f(X) < f(B):
    Rotate amplitude toward |1>, i.e., increase |beta_i|
If x_i == 1 and b_i == 0 and f(X) < f(B):
    Rotate amplitude toward |0>, i.e., increase |alpha_i|
```

This ensures that the quantum state continuously drifts toward high-fitness basins of attraction while maintaining probabilistic exploration across the entire landscape.

---

## 4. Key Findings & Convergence Characteristics

Simulations on benchmark 0-1 Knapsack instances demonstrate:

1. **Faster Convergence Rate**: QGA reaches optimal or near-optimal solutions in fewer generations than classical GA due to quantum parallelism.
2. **Resistance to Local Extrema**: Even when the population clusters around a local optimum, qubit amplitudes do not immediately collapse to 0 or 1, allowing quantum tunneling-like escapes from deceptive local optima.
3. **Drastic Population Reduction**: A QGA population of 10–20 quantum individuals consistently matches or exceeds the solution quality of a classical GA population of 100–200 bitstrings.

---

## Conclusion

Quantum-inspired evolutionary computation bridges theoretical quantum mechanics and practical discrete optimization on classical hardware. Exploring algorithms like QGA provides a solid mathematical foundation for transitioning into native quantum gate programming on QPU hardware (such as Qiskit and PennyLane).

Try the interactive quantum simulation in our [Quantum Lab](/labs/quantum) to visualize qubit state rotations in real time!
