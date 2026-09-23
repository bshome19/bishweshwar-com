---
id: lld-solid-principles-engineering-guide
title: "SOLID Principles: Practical Engineering Guide Without Academic Jargon"
track: lld
module: principles
level: intermediate
duration: 25
prerequisites: [lld-five-step-framework]
concepts: [solid, srp, ocp, lsp, isp, dip, dependency-injection, clean-architecture]
tags: [lld, solid, oop, clean-code, refactoring]
order: 2
---

# SOLID Principles: Practical Engineering Guide

The five **SOLID** principles are often memorized as academic definitions. In real-world software engineering, they are pragmatic design heuristics aimed at a single outcome: **allowing a codebase to grow in features without requiring constant modifications to existing, tested code.**

---

## 1. Single Responsibility Principle (SRP)
> *"A class should have one, and only one, reason to change."*

- **Violation**: An `OrderProcessor` class that validates items, calculates taxes, executes the credit card payment, generates an invoice PDF, and sends an SMTP email. Every time the finance team changes PDF fonts or marketing changes email copy, the core transactional order code must be modified and retested!
- **Engineering Fix**: Separate into cohesive classes:
  - `OrderService`: Coordinates checkout workflow.
  - `PaymentGateway`: Handles credit card interactions.
  - `NotificationService`: Formats and delivers emails.

---

## 2. Open/Closed Principle (OCP)
> *"Software entities should be open for extension, but closed for modification."*

- **Violation**: Using massive `switch(shapeType)` statements everywhere. Every time a new shape is introduced, you must find and modify every switch statement across the entire codebase.
- **Engineering Fix**: Polymorphism and the **Strategy Pattern**. Define an interface `AreaCalculable` with method `double area()`. New shapes implement the interface without touching a single line of existing code.

---

## 3. Liskov Substitution Principle (LSP)
> *"Subtypes must be substitutable for their base types without altering program correctness."*

- **The Classic Violation (The Square-Rectangle Problem)**:
  - A `Square` inherits from `Rectangle`.
  - The client calls `rectangle.setWidth(5)` and `rectangle.setHeight(10)`.
  - The `Square` overrides both to enforce equal sides, breaking the caller's reasonable assumption that area is 50!
- **Rule**: If a subclass throws an `UnsupportedOperationException` for an inherited method (e.g. `Penguin.fly()`), your abstraction hierarchy is broken. Favor composition.

---

## 4. Interface Segregation Principle (ISP)
> *"Clients should not be forced to depend on methods they do not use."*

- **Violation**: A monolithic "Fat Interface" `Worker` containing `work()`, `eat()`, `sleep()`, `generateReport()`, and `fileTaxes()`.
- **Engineering Fix**: Break into fine-grained, cohesive interfaces: `Workable`, `Reportable`, `Eatable`. Clients implement only the exact behaviors they require.

---

## 5. Dependency Inversion Principle (DIP)
> *"High-level modules should not depend on low-level modules. Both should depend on abstractions."*

- **Violation**: The high-level `BillingService` directly instantiates `new StripePaymentClient()` in its constructor. You cannot test `BillingService` without making live network calls to Stripe, and switching to PayPal requires rewriting the billing service.
- **Engineering Fix**: **Dependency Injection**.
  - `BillingService` accepts a `PaymentGateway` interface in its constructor.
  - In production, inject `StripePaymentGateway`.
  - In unit tests, inject `MockPaymentGateway` with zero network overhead.
