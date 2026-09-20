---
title: "Working with Database: REST APIs in Go Fiber using GORM"
description: "How to integrate GORM ORM with Go Fiber for efficient database interactions, connection pooling, schema migrations, and clean repository abstractions."
pubDate: 2023-09-22
category: "go"
tags: ["go", "fiber", "gorm", "postgresql", "databases", "orm"]
featured: false
canonicalUrl: "https://medium.com/@bshome19/working-with-database-rest-apis-in-go-fiber-using-gorm"
externalUrl: "https://medium.com/@bshome19"
readingTime: "6 min read"
---

In modern web development, interfacing with relational database storage efficiently without cluttering application code with boilerplate SQL is a constant balance. In the Go ecosystem, **GORM** is the premier Object Relational Mapping (ORM) library, offering developer productivity, type-safe query composition, automated migrations, and connection pooling.

Combining **Go Fiber** with **GORM** yields an exceptionally fast, developer-friendly backend stack. In this article, we cover setting up database persistence, managing connection pools, and implementing the repository pattern for separation of concerns.

---

## 1. Initializing Database Connection & Connection Pools

Never initialize database connections inside individual HTTP request handlers. Instead, create a shared, thread-safe connection instance with tuned connection pooling parameters:

```go
package database

import (
    "fmt"
    "log"
    "time"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    // Configure connection pool under the hood
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)

    log.Println("Database connection established with optimized pooling.")
    DB = db
    return db, nil
}
```

---

## 2. Model Definitions & Automated Migrations

GORM supports model struct tags for primary keys, indexes, nullability, and unique constraints:

```go
package models

import (
    "time"
    "gorm.io/gorm"
)

type LanguageRecord struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    Name        string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
    Year        int            `gorm:"not null" json:"year"`
    Creator     string         `gorm:"type:varchar(100)" json:"creator"`
    Description string         `gorm:"type:text" json:"description"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func Migrate(db *gorm.DB) error {
    return db.AutoMigrate(&LanguageRecord{})
}
```

---

## 3. The Repository Pattern

Separating database queries from HTTP handlers makes unit testing straightforward and isolates ORM logic:

```go
package repository

import (
    "context"
    "gorm.io/gorm"
    "yourproject/internal/models"
)

type LanguageRepository interface {
    Create(ctx context.Context, item *models.LanguageRecord) error
    FindAll(ctx context.Context) ([]models.LanguageRecord, error)
    FindByID(ctx context.Context, id uint) (*models.LanguageRecord, error)
}

type languageRepo struct {
    db *gorm.DB
}

func NewLanguageRepository(db *gorm.DB) LanguageRepository {
    return &languageRepo{db: db}
}

func (r *languageRepo) Create(ctx context.Context, item *models.LanguageRecord) error {
    return r.db.WithContext(ctx).Create(item).Error
}

func (r *languageRepo) FindAll(ctx context.Context) ([]models.LanguageRecord, error) {
    var records []models.LanguageRecord
    err := r.db.WithContext(ctx).Find(&records).Error
    return records, err
}
```

---

## 4. Connecting Handlers to the Repository

Inject the repository into your Fiber controller:

```go
package handlers

import (
    "strconv"
    "github.com/gofiber/fiber/v2"
    "yourproject/internal/models"
    "yourproject/internal/repository"
)

type LanguageController struct {
    repo repository.LanguageRepository
}

func NewLanguageController(repo repository.LanguageRepository) *LanguageController {
    return &LanguageController{repo: repo}
}

func (ctrl *LanguageController) GetAll(c *fiber.Ctx) error {
    records, err := ctrl.repo.FindAll(c.UserContext())
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to query database records",
        })
    }
    return c.JSON(records)
}
```

---

## 5. Production Considerations

1. **Always pass Context**: Use `c.UserContext()` from Fiber to support database query cancellation when client requests disconnect.
2. **Tune Connection Pool**: Adjust `MaxOpenConns` based on database CPU/RAM rather than using default unbounded limits.
3. **Soft Deletes**: Use `gorm.DeletedAt` to protect against accidental data loss while keeping query performance optimal with index coverage.
