# Partner Integration Platform

A backend application that simulates onboarding external partners to an API platform through connectivity setup, testing, certification, and production readiness.

The project follows a partner through each stage of the onboarding lifecycle and publishes events as key milestones are completed.

I built this project to better understand how partner API onboarding programs are managed, how certification workflows are tracked, and how event-driven patterns can be used to decouple downstream processes such as notifications and reporting.

## Features

- Partner API onboarding
- Connectivity tracking
- Testing management
- Certification management
- Go-live readiness
- Audit history
- Dashboard reporting
- PostgreSQL persistence
- Kafka event publishing and consumption
- Notification processing
- Request validation
- Durable event outbox with retry endpoint
- Dead-letter queue for failed event delivery/consumption
- Current-state lifecycle tables with append-only lifecycle history

## Architecture

The partner lifecycle is separated into four boundaries:

- `domain/` contains dependency-free lifecycle rules and domain events.
- `application/` coordinates use cases through application-owned ports.
- `infrastructure/` implements those ports for PostgreSQL, audit storage, and
  the event outbox.
- `interfaces/` and `routes/` adapt HTTP requests and responses.

Runtime dependencies are assembled in `composition/partnerApplication.js`.
See [docs/domain-rules.md](docs/domain-rules.md) for the current rule catalogue
and proposed rules that still need product confirmation.

The enforced onboarding progression is:

```text
Connectivity COMPLETED
        -> Testing PASSED with consistent successful results
        -> Certification CERTIFIED with approver and products
        -> Go-live READY with all approvals and rollback readiness
```

```text
Client / Partner Ops
        |
        v
Express Partner API
        |
        +--> Request validation
        |
        +--> PostgreSQL
        |       |
        |       +--> partners
        |       +--> current lifecycle tables
        |       +--> partner_lifecycle_history
        |
        +--> Partner event created
                |
                v
        PostgreSQL event_outbox
                |
                v
        Kafka topic: partner-lifecycle-events
                |
                v
        Kafka consumer
                |
                +--> Notification service
                |       |
                |       v
                |   partner_notifications
                |
                +--> event_dead_letters
                    for failed consumer processing

Outbox retry flow:

event_outbox pending/failed events
        |
        v
POST /events/outbox/retry
        |
        +--> republish to Kafka
        |
        +--> event_dead_letters
             after retry exhaustion
```

## Technology Stack

- Node.js
- Express
- PostgreSQL
- Kafka
- Docker
- KafkaJS

## Getting Started

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
brew services start postgresql
```

Start Kafka:

```bash
docker compose -f docker-compose.kafka.yml up -d
```

Create database:

```bash
createdb partner_integration
```

Create tables:

```bash
psql -d partner_integration -f db/schema.sql

psql -d partner_integration -f db/lifecycle-schema.sql

psql -d partner_integration -f db/event-notification-schema.sql
```

Run the application:

```bash
npm run dev
```

## Sample APIs

Create Partner

```http
POST /partners
```

Update Connectivity

```http
PATCH /partners/{partnerId}/connectivity
```

Update Testing

```http
PATCH /partners/{partnerId}/testing
```

Update Certification

```http
PATCH /partners/{partnerId}/certification
```

Update Go-Live

```http
PATCH /partners/{partnerId}/go-live
```

Partner Lifecycle View

```http
GET /partners/{partnerId}/full
```

Events

```http
GET /events
```

Notifications

```http
GET /notifications
```

Event Outbox

```http
GET /events/outbox
```

Retry Pending Outbox Events

```http
POST /events/outbox/retry
```

Dead Letters

```http
GET /events/dead-letters
```

## Example Flow

Partner Created

→ Connectivity Completed

→ Testing Passed

→ Certification Completed

→ Go-Live Ready

Lifecycle events are written to a durable outbox, published to Kafka, consumed by downstream services, and converted into notifications. Failed publishes stay visible in the outbox for retry, while exhausted publish attempts or consumer processing failures are captured in a dead-letter table for investigation.

## Reliability Model

- Partner lifecycle stage tables represent current state by partner and stage.
- Every lifecycle update is also recorded in `partner_lifecycle_history`.
- Events are persisted to `partner_events` and `event_outbox` before Kafka publish is attempted.
- `POST /events/outbox/retry` replays pending or failed outbox events.
- Events that exceed retry limits, or fail during consumer processing, are recorded in `event_dead_letters`.

## Tests

Run the unit tests:

```bash
npm test
```
