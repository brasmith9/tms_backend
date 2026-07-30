# Voyago — Tourism Management System (Backend)

NestJS + PostgreSQL backend for the Voyago tours marketplace: operators list
tours, an admin approves them, tourists search, book, pay through Paystack, and
review completed trips. Built with a pessimistic-locked booking core, real-time
Socket.io updates, scheduled sweeps, Brevo email, and Cloudinary uploads.

## Stack

NestJS 11 · TypeScript (strict) · PostgreSQL 16 · TypeORM (repository pattern) ·
Passport JWT + argon2 · Paystack · Socket.io · @nestjs/schedule ·
class-validator · Swagger · Brevo (email) · Cloudinary (images).

## Prerequisites

- Node ≥ 20.19, Yarn
- Docker (for local Postgres) — or any reachable Postgres

## Setup

```bash
yarn install
cp .env.example .env         # then fill in real values (see below)
docker compose up -d db      # local Postgres on host port 5544
yarn migration:run           # apply the schema
yarn seed                    # optional: demo data mirroring the app
yarn start:dev               # http://localhost:3000
```

Swagger UI: `http://localhost:3000/api/docs` · raw OpenAPI:
`http://localhost:3000/api/docs-json`.

### Environment

`.env` is gitignored; `.env.example` lists every key. Required: `DATABASE_URL`,
the four `JWT_*` secrets, and `PAYSTACK_*`. Optional integrations degrade
gracefully when unset: `BREVO_*` (password-reset email is logged and skipped),
`CLOUDINARY_*` (upload returns 503). `SEAT_HOLD_MINUTES` (default 15) and
`CANCELLATION_WINDOW_HOURS` (default 48) tune the booking rules.

## Response format

Every endpoint returns a uniform envelope:

```jsonc
{ "code": 200, "message": "OK", "data": { /* resource */ } }
```

List endpoints put results and paging under `data`:

```jsonc
{ "code": 200, "message": "OK",
  "data": { "results": [ ... ], "total": 45, "page": 1, "pageSize": 20, "totalPages": 3 } }
```

Errors use the same shape with `data: null` and an HTTP-status `code`.

## Tests

```bash
yarn test                                   # unit tests
yarn test src/modules/bookings              # a subset by path
yarn test -t "fully booked"                 # by test name

# e2e needs the throwaway test database:
docker compose up -d db_test                # Postgres on host port 5545
DATABASE_URL=postgres://voyago:voyago@localhost:5545/voyago_test yarn test:e2e
```

The e2e suite runs the full spine (search → book → pay → confirm → cancel) and a
concurrency test proving two racing bookings for the last seat yield exactly one
`201` and one `409`.

## Payments (Paystack, live)

`POST /api/v1/payments/initiate` calls Paystack and returns a checkout URL.
Paystack then posts `charge.success` to `POST /api/v1/payments/webhook`, which
verifies the `x-paystack-signature` (HMAC-SHA512 over the raw body) and confirms
the booking. Local webhooks need a public URL — run a tunnel (e.g. ngrok) and
register it in the Paystack dashboard. `GET /api/v1/payments/:reference/verify`
reconciles if a webhook is missed. Use Paystack **test-mode** keys for
development.

## Real-time

Two Socket.io namespaces, authenticated with the same access token as REST — see
[`docs/websocket-events.md`](docs/websocket-events.md). `/bookings` pushes
`booking.status_changed` to the owner; `/availability` broadcasts
`availability.changed` per departure.

## Scheduled jobs

Every minute, unpaid bookings past the seat-hold window are cancelled (releasing
seats). Every ten minutes, confirmed bookings on past departures are marked
completed and loyalty points awarded.

## Migrations

```bash
yarn migration:generate src/database/migrations/<Name>   # after entity changes
yarn migration:run
```

Migrations run automatically on boot in non-test environments.

## Project layout

```
src/
  common/       decorators, guards (JWT/roles/ownership), filters,
                interceptors (response envelope), pagination
  config/       env validation + typed config
  database/     data-source, migrations, seeds
  modules/      auth · users · destinations · tours · bookings ·
                payments · reviews · notifications · mail · uploads
```

Design and plan documents live in `docs/specs/` and `docs/plans/`.
