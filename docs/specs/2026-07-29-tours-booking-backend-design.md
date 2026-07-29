# Tours Booking Backend — Design

**Date:** 2026-07-29
**Status:** Approved
**Scope:** Sub-project 1 of the Voyago Tourism Management System backend

---

## 1. Context and scope

The Voyago prototype in `designs/` spans five bookable verticals (tours/attractions,
hotels, flights, restaurants, local transport) plus emergency assistance and a loyalty
programme. Built to the standard set out in the project engineering instructions, that is
several months of work, and two of those verticals (flights, transport) are dominated by
third-party aggregation and live dispatch rather than domain modelling.

This spec therefore covers **one vertical at full depth: tours and attractions**, which is
the core of a tourism management system and the vertical whose module list the engineering
instructions already anticipate.

**In scope:** authentication with RBAC, user and operator profiles, destinations, tour
listings with an approval workflow, departure-level inventory, bookings with a full
lifecycle, real Paystack payments, reviews gated on completed bookings, loyalty points, and
two Socket.io gateways.

**Explicitly out of scope** (each a later sub-project with its own spec): hotels, flights,
restaurants, local transport, emergency/SOS, saved places, stored payment methods, and
social login. The login screen's Google/Apple/Facebook buttons have no backend here.

**Success criteria.** The system demonstrates, end to end: an operator lists a tour, an
admin approves it, a tourist finds and books it, pays through Paystack, receives a live
status push, and can cancel within the refund window or review the tour after completion.
Two concurrent bookings for one remaining seat produce exactly one success and one
conflict.

---

## 2. Architecture

Feature-based NestJS modules. Controllers validate shape and delegate; services hold
business logic; repositories are the only layer touching TypeORM.

```
src/
  common/
    decorators/    @CurrentUser, @Roles
    guards/        JwtAuthGuard, RolesGuard, OwnershipGuard
    filters/       HttpExceptionFilter
    interceptors/  LoggingInterceptor
    dto/           PaginationDto, PaginatedResponseDto
  config/          env schema, validated on boot
  database/
    migrations/
    seeds/
  modules/
    auth/          local strategy, JWT access+refresh, rotation, revocation
    users/         profile, operator profiles, loyalty points
    destinations/  admin-managed reference data
    tours/         listings, approval workflow, departures (inventory)
    bookings/      lifecycle, reference codes, cancellation rules, cron jobs
    payments/      Paystack integration, webhook, reconciliation
    reviews/       gated on completed bookings, rating rollup
    notifications/ BookingsGateway, AvailabilityGateway
  main.ts
  app.module.ts
test/
  e2e/
```

---

## 3. Data model

Tables are plural `snake_case`. All money is stored as **integer minor units** (pesewas)
with an accompanying `currency` column — never floating point. All ids are UUIDs.

| Table | Columns |
|---|---|
| `users` | `id`, `email` uniq, `password_hash`, `full_name`, `phone`, `role`, `loyalty_points`, timestamps |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `user_agent` |
| `operator_profiles` | `user_id` uniq, `company_name`, `verified_at` |
| `destinations` | `id`, `name`, `region`, `country`, `description`, `hero_image_url`, `lat`, `lng` |
| `tours` | `id`, `operator_id`, `destination_id`, `title`, `slug` uniq, `description`, `price_minor`, `currency`, `duration_minutes`, `status`, `hero_image_url`, `rating_avg`, `rating_count` |
| `tour_departures` | `id`, `tour_id`, `departs_at`, `capacity`, `status` |
| `tour_bookings` | `id`, `reference` uniq, `tourist_id`, `departure_id`, `seats`, `unit_price_minor`, `total_minor`, `currency`, `status`, `cancelled_at` |
| `payments` | `id`, `booking_id`, `provider_ref` uniq, `amount_minor`, `currency`, `status`, `authorization_url`, `raw_event` |
| `reviews` | `id`, `tour_id`, `booking_id` uniq, `author_id`, `rating`, `body` |

Enums: `users.role` = `TOURIST | OPERATOR | ADMIN`. `tours.status` =
`DRAFT | PENDING_REVIEW | APPROVED | SUSPENDED`. `tour_departures.status` =
`SCHEDULED | CANCELLED`. `tour_bookings.status` =
`PENDING | CONFIRMED | CANCELLED | COMPLETED`. `payments.status` =
`PENDING | PAID | FAILED | REFUNDED`.

### Three load-bearing modelling decisions

**Capacity lives on `tour_departures`, not `tours`.** A tour is a product; a departure is
the sellable instance of it. This is what makes "how many seats remain on the 25 May
departure" a coherent question, and the departure row is what we lock when booking.

**`reviews.booking_id` is unique and NOT NULL.** A review is earned by taking a tour, not
posted freely. The database enforces one review per booking, and the service additionally
requires that booking to be `COMPLETED`. The invariant does not depend on service code
alone.

**Operator identity is a role on `users`, with business details in `operator_profiles`.**
One identity table and one login path for every actor; operator-specific fields live in a
satellite row. Avoids a parallel operators table with a second authentication story.

---

## 4. Booking lifecycle

```
                    ┌──────────── payment PAID ─────────────┐
                    │                                        ▼
  create ──▶ PENDING ──── 15 min, unpaid ────▶ CANCELLED   CONFIRMED
             (seats     │                                    │  │
              held)     └── payment FAILED ──▶ CANCELLED      │  │
                                                             │  │
                        tourist cancels >48h before departure ┘  │
                              (→ CANCELLED + refund)            │
                                                                │
                        departure time passes ──────────────────┘
                                     ▼
                                 COMPLETED  ──▶ unlocks review, awards points
```

`PENDING` bookings hold seats. That is what makes the expiry rule necessary: without it,
abandoned checkouts would block inventory indefinitely.

### Business rules

| Rule | Behaviour |
|---|---|
| Overbooking | Lock the departure row, sum `PENDING`+`CONFIRMED` seats, reject with 409 if the request would exceed capacity |
| Seat-hold expiry | Unpaid `PENDING` bookings older than `SEAT_HOLD_MINUTES` are cancelled by a cron job, releasing seats |
| Cancellation window | More than `CANCELLATION_WINDOW_HOURS` before departure: cancel and refund in full. Within the window: 409, window closed. Partial refunds are not modelled |
| Review gate | Only a `COMPLETED` booking yields a review; one per booking |
| Loyalty | `COMPLETED` awards 1 point per GHS 10 spent. Tier is derived from the point total at read time, never stored |
| Listing visibility | Public search returns `APPROVED` tours only; an operator additionally sees their own non-approved tours |
| Ownership | An operator mutating another operator's tour receives 403 from `OwnershipGuard` |

Both thresholds are configuration, not literals, so the seat hold can be shortened for a
live demonstration.

### Concurrency control

Overbooking is prevented with a **pessimistic row lock inside a transaction**:

```sql
BEGIN;
  SELECT * FROM tour_departures WHERE id = $1 FOR UPDATE;

  SELECT COALESCE(SUM(seats), 0) FROM tour_bookings
   WHERE departure_id = $1 AND status IN ('PENDING', 'CONFIRMED');

  -- taken + requested > capacity  ->  ConflictException (409)

  INSERT INTO tour_bookings (...);
COMMIT;
```

`tour_bookings` remains the single source of truth for seats consumed; there is no
denormalised counter that could drift from it. Bookings serialise per departure, which is
irrelevant at this scale.

Rejected alternatives: an atomic `seats_remaining` counter with a `CHECK` constraint (fast
and lock-free, but a denormalisation requiring correct restoration on every cancel, expiry
and refund) and optimistic `@VersionColumn` with retries (no held locks, but a retry policy
to justify and non-deterministic tests).

---

## 5. API surface

Versioned at `/api/v1`. Every list endpoint is paginated `?page=1&limit=20` and responds
`{ data, meta: { total, page, limit, totalPages } }`. Filtering and sorting are query
parameters, not bespoke routes.

```
auth          POST   /auth/register  /auth/login  /auth/refresh  /auth/logout
                     /auth/forgot-password  /auth/reset-password

users         GET    /users/me                    PATCH /users/me
              GET    /users/me/loyalty            points + derived tier

destinations  GET    /destinations  /destinations/:id            public
              POST   PATCH  DELETE                               ADMIN

tours         GET    /tours?destinationId=&minPrice=&maxPrice=&sort=-price
              GET    /tours/:slug                                public
              POST   /tours                                      OPERATOR, creates DRAFT
              PATCH  /tours/:id                                   OPERATOR, owner only
              POST   /tours/:id/submit                            OPERATOR → PENDING_REVIEW
              POST   /tours/:id/approve   /tours/:id/suspend       ADMIN
              GET    /tours/:id/departures                         public, seats remaining
              POST   /tours/:id/departures                         OPERATOR, owner only

bookings      POST   /bookings                                    TOURIST, creates PENDING
              GET    /bookings/me?status=upcoming|completed|cancelled
              GET    /bookings/:reference                          owner | operator | ADMIN
              POST   /bookings/:reference/cancel                    TOURIST, window-checked
              GET    /bookings/operator/me                          OPERATOR, own tours

payments      POST   /payments/initiate                            TOURIST
              POST   /payments/webhook                             Paystack, signed
              GET    /payments/:reference/verify                    reconciliation fallback

reviews       GET    /tours/:id/reviews                            public, paginated
              POST   /bookings/:reference/review                    TOURIST, COMPLETED only
```

Bookings are addressed by human reference (`TUR-2026-4471`) rather than UUID, because that
is what the My Bookings screen displays and what a user would read aloud. The
`status` filter maps onto that screen's three tabs:

| Query value | Matches |
|---|---|
| `upcoming` | `PENDING` or `CONFIRMED` with a departure still in the future |
| `completed` | `COMPLETED` |
| `cancelled` | `CANCELLED` |

Status codes: `POST` → 201, `DELETE` → 204, validation failure → 400, unauthenticated →
401, forbidden → 403, missing → 404, conflict (full departure, closed cancellation window,
duplicate review) → 409.

---

## 6. Payments (Paystack, live integration)

Paystack is the only payment implementation. There is no stub or simulated provider in the
application.

**Charge flow**

1. `POST /payments/initiate` for a `PENDING` booking calls Paystack
   `POST /transaction/initialize` with the booking's `total_minor`, `GHS`, the tourist's
   email, and the booking reference as the Paystack `reference`.
2. The `authorization_url` is persisted and returned; the client completes payment on
   Paystack.
3. Paystack posts `charge.success` to `POST /payments/webhook`. The handler verifies the
   signature, marks the payment `PAID`, transitions the booking to `CONFIRMED`, and emits
   `booking.status_changed`.
4. `GET /payments/:reference/verify` calls Paystack `GET /transaction/verify/:reference`
   and reconciles. This exists because webhook delivery is not guaranteed.

**Signature verification.** Paystack signs the request with HMAC-SHA512 over the exact
request bytes using the secret key, in the `x-paystack-signature` header. The application
bootstraps with `rawBody: true` and the webhook route verifies against the raw buffer, not
the re-serialised JSON body — re-serialising changes the bytes and the signature never
matches.

**Idempotency.** Paystack may deliver a webhook more than once. `payments.provider_ref` is
unique, and a webhook for an already-`PAID` payment is acknowledged with 200 and otherwise
ignored. Replays must never double-confirm a booking or double-award loyalty points.

**Refunds.** Cancellation inside the refund window calls Paystack's refund endpoint and
moves the payment to `REFUNDED`.

**Local development** requires a public callback URL for webhooks; localhost is not
reachable from Paystack. Test-mode keys are used for development and the e2e suite. Keys
live in `.env`, which is gitignored; `.env.example` carries placeholders only.

---

## 7. Real-time events

Two gateways, one bounded concern each, documented in `docs/websocket-events.md`. Both
authenticate the handshake with the same access token as REST.

```
BookingsGateway          room  user:<userId>              joined on connect
  ← booking.status_changed   { reference, status, changedAt }

AvailabilityGateway      room  departure:<departureId>
  → departure.subscribe      { departureId }
  → departure.unsubscribe    { departureId }
  ← availability.changed     { departureId, seatsLeft, capacity }
```

`availability.changed` is emitted **after** the booking transaction commits, never inside
the lock, so a rolled-back transaction cannot emit a phantom update.

---

## 8. Cross-cutting concerns

**Errors.** A single global `HttpExceptionFilter` produces the standard envelope
(`statusCode`, `message`, `error`, `timestamp`, `path`); no controller hand-rolls an error
body. TypeORM `QueryFailedError` on a unique violation is translated to 409 rather than
leaking as a 500.

**Serialisation.** Global `ValidationPipe` with `whitelist: true` and
`forbidNonWhitelisted: true`. Global `ClassSerializerInterceptor`, with `@Exclude()` on
`password_hash` and `token_hash`, so a forgotten field cannot leak. Controllers return
`*ResponseDto`, never entities.

**Documentation.** `@ApiTags` per controller, `@ApiOperation` per endpoint, `@ApiProperty`
with a realistic example on every DTO field, and `@ApiResponse` for each non-2xx a client
will actually hit. Served at `/api/docs`, raw OpenAPI at `/api/docs-json`.

**Security.** `helmet`; throttling at 100 requests/minute globally and 5/minute on auth
routes; CORS restricted to configured origins; argon2 password hashing; parameterised
queries only.

**Configuration**, validated on boot so a missing secret fails immediately:

```
PORT                      DATABASE_URL              CORS_ORIGINS
JWT_ACCESS_SECRET         JWT_ACCESS_TTL
JWT_REFRESH_SECRET        JWT_REFRESH_TTL
PAYSTACK_SECRET_KEY       PAYSTACK_PUBLIC_KEY       PAYSTACK_BASE_URL
SEAT_HOLD_MINUTES=15      CANCELLATION_WINDOW_HOURS=48
```

**Scheduled jobs** (`@nestjs/schedule`, in the bookings module): expire unpaid `PENDING`
bookings past the hold window; mark `CONFIRMED` bookings `COMPLETED` once their departure
has passed, awarding loyalty points.

---

## 9. Testing strategy

- **Unit** — every service method, repositories and the Paystack HTTP client mocked, no
  database and no network. Arrange/Act/Assert, one behaviour per `it()`, named for
  behaviour: `it('throws ConflictException when the departure is fully booked')`.
- **Controller** — service mocked; asserts guards and pipes are actually applied. These
  are the tests that catch a missing `@Roles(ADMIN)`.
- **E2E** — against a real throwaway Postgres via docker-compose, using Paystack test-mode
  keys. Covers the full spine: register → operator creates tour → admin approves → tourist
  books → pays → confirmed → cancels or reviews.

  Paystack's hosted checkout is a browser flow and cannot be driven from a test suite, so
  the payment leg is exercised in two halves. `POST /payments/initiate` makes a **real
  call** to Paystack test mode and asserts on the returned `authorization_url` and
  reference. Confirmation is then driven by posting a webhook payload to
  `POST /payments/webhook` signed with the test secret key, which exercises the real
  HMAC-SHA512 verification path rather than bypassing it. No browser automation, and no
  substitute provider — only the human checkout step is stood in for.
- **Concurrency** — two simultaneous bookings for one remaining seat assert exactly one
  201 and one 409. This test is the justification for the locking design.

Target roughly 80% coverage on services. Coverage is not chased on DTOs and entities.

---

## 10. Seed data

Seeds mirror the prototype so the running system matches the screens: destinations Cape
Coast, Accra, Kumasi, Mole and Elmina; tours including Kakum Canopy Walk (GHS 120) and
Mole Safari Tour (GHS 280); two operators with approved listings, one admin, and one
tourist holding bookings across the upcoming, completed and cancelled tabs.

---

## 11. Deferred

Hotels, flights, restaurants, local transport, emergency/SOS, saved places, stored payment
methods, social login (Google/Apple/Facebook), and multi-currency. Each becomes its own
spec. The bookings core is designed so a second vertical can reuse the lifecycle, reference
codes, payments and reviews without reshaping them.
