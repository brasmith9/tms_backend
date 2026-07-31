# Decimal money at the API boundary

**Date:** 2026-07-31
**Status:** Accepted

## Problem

Every money field on the public API is an integer in minor units (pesewas) named
`*Minor`. Clients think in cedis, so the natural payload `{ "price": 150.50 }` is
rejected: `CreateTourDto.priceMinor` carries `@IsInt()`, which fails with
`priceMinor must be an integer`. Submitting a price with coins requires the client
to know the field is pesewas and pre-multiply by 100.

## Decision

Keep integer pesewas everywhere internally. Convert to and from decimal cedis at
the API boundary only.

Storage, entity columns, booking arithmetic, loyalty points, and the Paystack
integration are unchanged. `payments.service.ts:45` still hands
`booking.totalMinor` straight to Paystack, which expects pesewas for GHS.

Rejected: migrating columns to `numeric(12,2)`. TypeORM returns `numeric` as
`string` in JS, so every read site would need parsing, and any `parseFloat`
reintroduces binary-float rounding into arithmetic like `seats × unitPrice` —
the exact class of bug integer pesewas prevent.

## Field renames

Money fields drop the `Minor` suffix and carry decimal cedis.

| Surface | Before | After |
| --- | --- | --- |
| `CreateTourDto` (and `UpdateTourDto` via `PartialType`) | `priceMinor` | `price` |
| `TourQueryDto` | `minPrice`, `maxPrice` (pesewas) | same names, decimal cedis |
| `TourResponseDto` | `priceMinor` | `price` |
| `BookingResponseDto` | `totalMinor` | `total` |
| `PaymentResponseDto` | `amountMinor` | `amount` |
| `GenerateItineraryDto` | `budgetMinor` | `budget` |
| `ItineraryResponseDto` | `budgetMinor` | `budget` |
| `ItineraryResponseDto.plan` | `estimatedCostMinor`, `estimatedTotalMinor` | `estimatedCost`, `estimatedTotal` |

This is a breaking change. `forbidNonWhitelisted: true` on the global
`ValidationPipe` means an old payload sending `priceMinor` fails with a 400
rather than silently mispricing — the correct failure mode pre-release.

## Conversion

A shared `src/common/money.ts`:

- `cedisToPesewas(cedis: number): number` — `Math.round(cedis * 100)`. Rounding
  absorbs float artifacts such as `150.55 * 100 === 15054.999999999998`.
- `pesewasToCedis(pesewas: number): number` — `Number((pesewas / 100).toFixed(2))`.

Responses carry a JSON **number**, not a string: `price: 150.5`, not `"150.50"`.
Trailing-zero formatting is a display concern for the client.

## Validation

Inbound money uses `@IsNumber({ maxDecimalPlaces: 2 })` with `@Min(0)`, replacing
`@IsInt()`. More than two decimal places is **rejected** with a 400, not silently
rounded — sub-pesewa precision in a price is a client bug, and rounding money
without telling anyone hides it.

`TourQueryDto` keeps `@Type(() => Number)` so query strings coerce before
validation. Its `minPrice`/`maxPrice` convert to pesewas in the repository before
comparison against `tour.price_minor`.

## Itinerary plan blob

`plan` is AI-generated and persisted as jsonb holding `estimatedCostMinor` and
`estimatedTotalMinor`. Storage and the LLM prompt schema in
`openrouter.planner.ts` stay in pesewas; `ItineraryResponseDto.from` maps the plan
to decimal cedis on the way out. Existing stored rows therefore need no migration.

## Testing

- Unit spec for `money.ts`: round-trip, the `150.55` float-artifact case, zero.
- `tours.service.spec.ts`: `price: 150.5` persists as `priceMinor: 15050`.
- `itineraries.service.spec.ts`: `budget` converts on the way in, plan costs
  convert on the way out.
- e2e: `POST /tours` with `price: 150.5` round-trips as `price: 150.5`, and a
  three-decimal price returns 400.
