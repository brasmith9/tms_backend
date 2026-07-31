# Seed Data Expansion — Design

**Date:** 2026-07-31
**Status:** Approved, ready for implementation planning

## Problem

The seed produces too little data to exercise the app. List screens do not paginate,
filters and sorting have nothing to bite on, and nine entities have never been seeded at
all, so several screens render empty states in demos.

Current coverage:

| Table | Rows |
| --- | --- |
| users | 4 |
| destinations | 5 |
| tours | 3 (1 departure each) |
| tour_bookings | 3 |
| medical_facilities | 8 |
| restaurants | 4 |
| stays | 3 (6 rooms) |
| flights | 150 |
| drivers | 8 |

Never seeded: `reviews`, `payments`, `reservations`, `itineraries`, `emergency_contacts`,
`sos_alerts`, `rides`, `ride_quotes`, `flight_offers`.

## Scope

In scope:

1. Grow the existing catalogue tables.
2. Seed `reviews`, and give tours real rating aggregates.
3. Seed tourist history: `reservations`, `payments`, `itineraries`, `emergency_contacts`.

Out of scope, with reasons:

- `rides`, `ride_quotes`, `flight_offers`, `sos_alerts` — created by live user flows and
  time-expiring. Seeded rows go stale immediately.
- `refresh_tokens`, `password_reset_tokens` — runtime auth artifacts, never seed data.
- **Today's Deals.** The designs show discounted pricing (`GHS 450` struck through from
  `GHS 650`) that no column can express: `tour.entity.ts:25` has only `priceMinor`, and
  `stay.entity.ts:33` only `fromPriceMinor`. Deals needs a schema decision of its own
  (discount columns vs. a polymorphic `Deal` entity) and is deferred to its own ticket.
- **No schema changes.** Everything here works against the current entities and needs no
  migration.

## Approach

Split the data, keep the orchestrator linear.

`data.ts` (400 lines, growing to ~1400) is replaced by a `data/` directory of pure-array
modules. `seed.ts` keeps its current top-to-bottom shape.

The alternative — extracting per-entity seeder modules threaded with a shared
`SeedContext` — was rejected. The seed order is a real dependency chain
(users -> destinations -> tours -> departures -> bookings -> reviews), and a linear script
expresses that chain better than a context object passed across ten files. `seed.ts` at
~600 lines is longer than ideal; extracting seeders stays available as a follow-up if it
grows further.

### File layout

```
src/database/seeds/
  data/
    index.ts          re-exports; owns shared IMG(), ALL_WEEK, SEED_PASSWORD
    users.ts          seedUsers, seedReviewers
    destinations.ts   seedDestinations
    tours.ts          seedTours
    stays.ts          seedStays (rooms nested)
    restaurants.ts    seedRestaurants
    facilities.ts     seedFacilities
    drivers.ts        seedDrivers
    flights.ts        seedFlightRoutes
    history.ts        seedReservations, seedItineraries, seedEmergencyContacts
  seed.ts             orchestrator
```

Two arrays that are data but currently live in `seed.ts` move into `data/`: the flight
`routes` array (`seed.ts:221-262`) and `seedDrivers` (`seed.ts:302-391`). The flight
*generation* loop stays in `seed.ts` because it computes dates. `data/index.ts`
re-exports everything, so the import block at `seed.ts:21-29` barely changes.

## Data design

### Catalogue

| Table | Now | After | Notes |
| --- | --- | --- | --- |
| destinations | 5 | 12 | adds Ho, Busua, Wli Falls, Ada Foah, Tamale, Axim, Nzulezo |
| tours | 3 | 30 | 2-3 per destination, split across both operators |
| tour_departures | 3 | 90 | 3 per tour: one past, two upcoming |
| stays | 3 | 15 | ~40 rooms, mixed `StayCategory` |
| restaurants | 4 | 20 | each with menu and opening hours |
| medical_facilities | 8 | 15 | real facilities, true coordinates |
| drivers | 8 | 15 | Accra-clustered, spread across `VehicleType` |
| flights | 150 | ~300 | 10 routes, same generator |

Realism bar, matching the existing seed: real place names, real coordinates, GHS prices in
pesewas reflecting actual Ghanaian pricing, Unsplash photo IDs. No faker output.

**Known limitation:** establishment names, regions, and approximate coordinates are
reliable. Current phone numbers and exact prices for newly added restaurants and hotels
are not independently verified. Real published numbers are used only where confidence is
high (as with Korle Bu today); otherwise entries use the `+233XX` reserved-style pattern
already used for drivers. Making every number dialable is a data-sourcing task outside
this work.

### Departures

Each tour gets three departures instead of one: one in the past, two upcoming. Past
departures are what make completed bookings and reviews coherent. `DepartureStatus` has
only `SCHEDULED` and `CANCELLED` (`tour-departure.entity.ts:3-6`), so a past departure is
simply `SCHEDULED` with a past `departsAt`. No new status is needed.

### Reviews and ratings

`Review` is tour-only and tightly constrained: `tourId` + `bookingId` where `bookingId` is
`unique` (`review.entity.ts:12-13`), and `reviews.service.ts:41` rejects any booking that
is not `COMPLETED`. One review therefore costs one completed booking.

Stays and restaurants already carry seeded `ratingAvg`/`ratingCount` literals
(`data.ts:320,350,380` and `233,257,281,305`). Tours carry none — they only gain ratings
through `tours.service.ts:132-134` when a review is posted. Tours are the gap.

Hybrid approach:

- 25 reviewer users (`reviewer01@voyago.test` ...), tourist role, sharing `SEED_PASSWORD`.
- ~48 `COMPLETED` bookings against past departures, across 8 well-known tours.
- ~48 reviews, 5-8 per tour, one per booking.
- Those 8 tours get `ratingAvg`/`ratingCount` **computed from their own review rows**, so
  aggregates and rows reconcile. The seed writes rows directly and bypasses
  `tours.service.ts`, so it must compute these itself.
- The other 22 tours get literals in a comparable range: 4-40 reviews, 4.1-4.9 average.

Literal counts are deliberately modest rather than stay-style figures such as `210`. If
unreviewed tours showed "128 reviews" beside reviewed ones showing "6", the seed would
look broken. Existing stay and restaurant counts are left untouched.

**Existing inconsistency fixed:** `seed.ts:141-144` marks `cape-coast-castle-tour`
`COMPLETED` while its only departure is `departureDaysFromNow: 14` — a completed trip that
has not departed. That booking is repointed at a past departure.

### Tourist history

All attached to the existing demo tourist `kofi@voyago.test`, so a single login shows a
populated app.

- **6 reservations** — 2 `STAY`, 2 `FLIGHT`, 2 `TABLE`, mixed
  `CONFIRMED`/`COMPLETED`/`CANCELLED`. The `item` jsonb snapshot
  (`reservation.entity.ts:24-32`) is filled from the corresponding seeded stay, flight, or
  restaurant so trip lists render standalone.
- **8 payments** — `PAID` against confirmed and completed bookings, plus one `FAILED` and
  one `REFUNDED`. `source` set per `PaymentSource` (`TOUR` vs `RESERVATION`).
- **2 itineraries** — hand-written 3-day Cape Coast and 2-day Kumasi plans.
  `Itinerary.model` (`itinerary.entity.ts:22`) is set to `'seed'`, not a real model id, so
  nothing claims to be AI-generated when it was not.
- **3 emergency contacts** — next of kin with `relationship` populated.

## Idempotency

Every block keeps the existing find-by-natural-key-then-skip pattern, so re-running the
seed adds nothing. Keys for the new tables:

| Table | Key | Note |
| --- | --- | --- |
| reservations | `reference` | already `unique` |
| payments | `providerRef` | already `unique` |
| reviews | `bookingId` | already `unique` |
| emergency_contacts | `(userId, phone)` | no unique column |
| itineraries | `(userId, title)` | no unique column |

## Verification

Run against local Postgres (`DATABASE_URL` -> `localhost:5544/voyago`).

1. Confirm the database is reachable, and run pending migrations.
2. `yarn seed` on a fresh database succeeds.
3. `yarn seed` a second time prints `=` for every line and adds zero rows.
4. Row counts per table match the tables above, checked by direct query.
5. Derived aggregates reconcile: for each of the 8 reviewed tours,
   `ratingCount` equals its number of review rows and `ratingAvg` equals their mean.
6. `yarn build` and `yarn lint` are clean.

No claim of success is made for any step that has not actually been run.

## Risks

- **Volume of hand-written data.** ~1400 lines of catalogue data is the bulk of the work
  and the most error-prone part. FK wiring (tours to destinations by name, tours to
  operators by email) is checked by running the seed, not by inspection.
- **Unverified real-world details.** See the limitation noted under Catalogue.
- **`seed.ts` at ~600 lines.** Accepted deliberately; revisit if it grows further.
