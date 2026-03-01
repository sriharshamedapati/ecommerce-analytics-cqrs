# E-Commerce Analytics – CQRS with Transactional Outbox

## Overview

This project implements a containerized e-commerce analytics system using a CQRS-based architecture with a transactional outbox pattern.

The system consists of:

* A **Command Service** (Node.js + Express) for write operations
* A **Query Service** (Node.js + Express) for read/analytics endpoints
* A **Consumer Service** that processes events from RabbitMQ
* A **PostgreSQL write database**
* A **PostgreSQL read database**
* **RabbitMQ** as the message broker

All services are orchestrated using `docker-compose.yml`.

The implementation includes:

* Product and order creation
* Transactional outbox for reliable event publishing
* Idempotent event consumption
* Read-model projections for analytics
* Sync lag monitoring endpoint

---

## Architecture / Workflow

The workflow implemented in code is:

1. **Product Creation**

   * `POST /api/products`
   * Inserts product into write database (`products` table)
   * Writes a `ProductCreated` event into the `outbox` table
   * Transaction is committed

2. **Order Creation**

   * `POST /api/orders`
   * Inserts order into `orders`
   * Inserts order items into `order_items`
   * Writes an `OrderCreated` event into `outbox`
   * All operations occur inside a single database transaction

3. **Outbox Publisher**

   * Implemented in `command-service/src/publisher/outboxPublisher.js`
   * Periodically reads unprocessed rows from `outbox`
   * Publishes events to RabbitMQ
   * Marks them as processed

4. **Consumer Service**

   * Implemented in `consumer-service/src/main.js`
   * Subscribes to `order-events` queue
   * Implements idempotency using `processed_events` table
   * Updates read database projections:

     * `products`
     * `product_sales_view`
     * `category_metrics_view`
     * `customer_ltv_view`
     * `hourly_sales_view`

5. **Query Service**

   * Implemented in `query-service/src/main.js`
   * Reads only from the read database
   * Exposes analytics endpoints

---

## Key Components

### Command Service

Location:

```
command-service/src/
```

Files:

* `main.js` – Express app setup and route mounting
* `config/db.js` – PostgreSQL pool configuration
* `controllers/productController.js`
* `controllers/orderController.js`
* `publisher/outboxPublisher.js`

Responsibilities:

* Handle write operations
* Insert events into `outbox`
* Start outbox publisher

---

### Consumer Service

Location:

```
consumer-service/src/main.js
```

Responsibilities:

* Connect to RabbitMQ
* Consume events
* Enforce idempotency using `processed_events`
* Update read-side projections

Implements logic for:

* ProductCreated → inserts into read `products`
* OrderCreated → updates all aggregation tables

---

### Query Service

Location:

```
query-service/src/main.js
```

Endpoints implemented:

* `GET /api/analytics/products/:productId/sales`
* `GET /api/analytics/categories/:category/revenue`
* `GET /api/analytics/customers/:customerId/lifetime-value`
* `GET /api/analytics/sync-status`
* `GET /health`

All endpoints query the read database only.

---

## Database Design

### Write Database (Primary DB)

Tables:

* `products`
* `orders`
* `order_items`
* `outbox`

Outbox schema includes:

* `id`
* `topic`
* `payload`
* `created_at`
* `published_at`

---

### Read Database

Tables used as projections:

* `products`
* `product_sales_view`
* `category_metrics_view`
* `customer_ltv_view`
* `hourly_sales_view`
* `processed_events`

These are updated only by the consumer.

---

## Design Decisions

* CQRS separation: write and read logic are isolated.
* Transactional Outbox: events are inserted within the same transaction as writes.
* Idempotent consumer: `processed_events` prevents duplicate processing.
* Aggregations are stored in tables (not computed dynamically).
* Sync monitoring endpoint calculates lag using `processed_events`.

No additional abstraction layers (repositories/services) were used beyond what is implemented.

---

## Setup & Installation

Requirements:

* Docker
* Docker Compose

No manual database setup required.

---

## How to Run

From project root:

```
docker-compose up --build
```

Command Service:

```
http://localhost:8080
```

Query Service:

```
http://localhost:8081
```

---

## Example Usage

Create Product:

```
POST /api/products
```

Create Order:

```
POST /api/orders
```

Product Sales:

```
GET /api/analytics/products/{productId}/sales
```

Category Revenue:

```
GET /api/analytics/categories/{category}/revenue
```

Customer LTV:

```
GET /api/analytics/customers/{customerId}/lifetime-value
```

Sync Status:

```
GET /api/analytics/sync-status
```

---

## Folder Structure

```
ecommerce-analytics-cqrs/
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── submission.json
├── README.md
│
├── docs/
│   └── data-flow.png
│
├── db-init/
│   └── init.sql
│
├── read-db-init/
│   └── init.sql
│
├── command-service/
│   ├── Dockerfile
│   └── src/
│       ├── main.js
│       ├── config/db.js
│       ├── controllers/
│       └── publisher/
│
├── consumer-service/
│   ├── Dockerfile
│   └── src/main.js
│
└── query-service/
    ├── Dockerfile
    └── src/main.js
```

---

## Future Improvements

Not implemented in current version:

* Unit or integration tests
* Authentication / authorization
* Stock validation before order creation
* Event retry backoff strategy
* Metrics or structured logging
* API documentation (e.g., Swagger)

These can be added in future iterations.

This README strictly reflects what is implemented in the codebase shared in this chat.
