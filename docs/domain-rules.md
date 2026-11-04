# Partner lifecycle domain rules

This document is the initial business-rule catalogue for the partner onboarding
domain. Rules marked **current** are already implied by the public API and are
enforced by the domain layer. Rules marked **proposed** need product confirmation
before they are enforced.

## Partner

- **Current:** a partner requires a non-empty identifier and name.
- **Current:** a new partner starts in `REQUESTED` status.
- **Current:** supported partner statuses are `REQUESTED`, `APPROVED`, `REJECTED`,
  and `SUSPENDED`.
- **Current:** a partner identifier is unique.
- **Proposed:** only explicitly defined partner-status transitions should be
  permitted (for example, `REQUESTED` to `APPROVED` or `REJECTED`).

## Lifecycle stages

- **Current:** connectivity, testing, certification, and go-live updates can only
  be recorded for an existing partner.
- **Current:** every lifecycle update is appended to lifecycle history.
- **Current:** `PARTNER_CERTIFIED` is raised only when certification status is
  `CERTIFIED`.
- **Current:** `PARTNER_READY_FOR_GO_LIVE` is raised only when go-live status is
  `READY`.
- **Proposed:** testing cannot start until connectivity is complete.
- **Proposed:** certification cannot complete until testing has passed.
- **Proposed:** a `PASSED` testing result should have no failed or blocked cases,
  and its counts should add up to the total number of test cases.
- **Proposed:** certification should identify an approver and at least one
  certified product.
- **Proposed:** go-live readiness requires certification, business, technology,
  and operations approval, plus a ready rollback plan.

## Consistency and events

- **Current:** domain code decides which events occurred; it does not publish to
  Kafka or write to PostgreSQL.
- **Current:** saving lifecycle state, appending history, and storing domain
  events in the outbox share one database transaction. Kafka delivery happens
  after that transaction commits.
