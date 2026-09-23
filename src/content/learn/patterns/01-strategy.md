---
id: pattern-strategy
title: "Strategy Pattern: Stop Growing the Nested if-else Monster"
track: patterns
module: behavioral
level: beginner
duration: 20
prerequisites: [lld-five-step-framework]
concepts: [strategy, polymorphism, composition, open-closed-principle, behavioral-patterns]
tags: [patterns, lld, oop, refactoring, strategy]
order: 1
---

# Strategy Pattern: Stop Growing the Nested if-else Monster

Consider a pricing calculation method in an e-commerce platform:

```java
// CODE SMELL: THE EVER-GROWING IF-ELSE MONSTER
public double calculateFinalPrice(Order order, CustomerType type) {
    if (type == CustomerType.REGULAR) {
        return order.getTotal();
    } else if (type == CustomerType.PREMIUM) {
        return order.getTotal() * 0.90; // 10% discount
    } else if (type == CustomerType.VIP) {
        return order.getTotal() * 0.80; // 20% discount
    } else if (type == CustomerType.BLACK_FRIDAY) {
        return order.getTotal() * 0.50; // 50% flash sale
    }
    // What happens when product management adds 12 more discount tiers next week?
    throw new IllegalArgumentException("Unknown customer type");
}
```

Every time marketing introduces a new promotion, you must modify this method, risk breaking existing pricing calculations, and re-run all regression suites.

---

## 1. The Strategy Pattern Solution

The **Strategy Pattern** defines a family of interchangeable algorithms, encapsulates each one inside a separate class, and makes them swappable at runtime.

```
                  ┌───────────────────────────────┐
                  │       <<interface>>           │
                  │       PricingStrategy         │
                  ├───────────────────────────────┤
                  │ + calculatePrice(Order): double│
                  └───────────────▲───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ RegularPricing   │    │ PremiumPricing   │    │ BlackFridaySale  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Clean Implementation

```java
public interface PricingStrategy {
    double calculatePrice(Order order);
}

public class RegularPricingStrategy implements PricingStrategy {
    @Override
    public double calculatePrice(Order order) {
        return order.getBaseAmount();
    }
}

public class PremiumPricingStrategy implements PricingStrategy {
    @Override
    public double calculatePrice(Order order) {
        return order.getBaseAmount() * 0.90;
    }
}

// Context: Depends exclusively on the abstraction
public class CheckoutService {
    private PricingStrategy pricingStrategy;

    public CheckoutService(PricingStrategy pricingStrategy) {
        this.pricingStrategy = pricingStrategy;
    }

    public void setPricingStrategy(PricingStrategy pricingStrategy) {
        this.pricingStrategy = pricingStrategy; // Dynamically swappable!
    }

    public double executeCheckout(Order order) {
        return this.pricingStrategy.calculatePrice(order);
    }
}
```

---

## 2. When to Use (and When to Avoid)

### Use When:
- You have multiple variations of an algorithm (e.g., sorting algorithms, route calculation strategies [Fastest, Shortest, Scenic], payment gateways, spot allocation rules).
- You want to isolate complex algorithm logic from the business context that invokes it.
- You need to dynamically switch behaviors at runtime (e.g., switching from `FixedWindowRateLimiter` to `TokenBucketRateLimiter`).

### Avoid When:
- You only have 2 stable branches that will never change (e.g., boolean `isActive ? 1 : 0`). Creating 4 classes and interfaces for 2 lines of trivial code adds unnecessary cognitive overhead.
