---
title: "E-Commerce Web Application for Handicrafts"
description: "Backend architecture for an artisan handicrafts marketplace, orchestrating RESTful microservices, authentication, and inventory using Go, Gin, and MongoDB."
status: "completed"
technologies: ["Go", "Gin", "MongoDB", "REST APIs", "JWT Auth", "Docker"]
github: "https://github.com/bshome19"
featured: false
category: "Backend & Web Services"
metrics: [
  "Modular RESTful microservices in Go",
  "High-concurrency Gin HTTP routing",
  "Document schema design in MongoDB",
  "JWT-based role authentication"
]
order: 3
---

## Overview

A full-featured backend system built to empower local artisans to catalog, price, and sell handcrafted goods online. Built using the **Go programming language** and the **Gin web framework**, with **MongoDB** as the flexible document storage layer.

## Architecture

- **Auth Service**: User signup, bcrypt password hashing, and stateless JWT token signing and verification.
- **Product Catalog Service**: Category filtering, tag search, artisan profiles, and asset metadata.
- **Order & Cart Service**: Transactional cart state management, checkout validation, and order history tracking.

## Technical Highlights

- Leveraged Go's goroutines for asynchronous order confirmation email notifications.
- Utilized MongoDB aggregation pipelines for artisan sales analytics and inventory monitoring.
- Packaged services into lightweight Docker containers for reproducible local development and cloud hosting.
