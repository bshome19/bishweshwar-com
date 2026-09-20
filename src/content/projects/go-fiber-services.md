---
title: "Go Fiber REST API & Database Services"
description: "A production-oriented reference implementation of high-throughput RESTful services using Go Fiber and GORM with connection pooling, migrations, and clean repository patterns."
status: "completed"
technologies: ["Go", "Fiber", "GORM", "PostgreSQL", "MySQL", "Docker"]
github: "https://github.com/bshome19/programming-languages-with-db"
featured: false
category: "Backend & Web Services"
metrics: [
  "Fasthttp-powered zero-allocation routing",
  "Tuned database connection pooling (GORM)",
  "Repository pattern for decoupled data access",
  "Automated schema migrations"
]
order: 4
---

## Overview

A robust reference service demonstrating modern Go backend development patterns. Built around the high-speed **Fiber** framework (backed by Fasthttp) and integrated with **GORM** for relational database interaction.

Accompanied by published technical guides on Dev Genius:
- *Building High-Performance REST APIs using Go Fiber*
- *Working with Database: REST APIs in Go Fiber using GORM*

## Key Patterns Demonstrated

1. **Layered Architecture**: Strict separation between Transport layer (Fiber HTTP handlers), Service layer (business logic), and Data layer (GORM repository).
2. **Connection Pool Optimization**: Configured `SetMaxOpenConns` and `SetMaxIdleConns` to prevent socket starvation under sustained concurrent loads.
3. **Context Propagation**: Passed client cancellation signals into database transactions to terminate abandoned backend queries.
4. **Containerization**: Multi-stage Dockerfiles producing minimal (<15MB) deployment containers.
