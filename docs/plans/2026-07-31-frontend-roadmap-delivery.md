# Frontend roadmap delivery plan

Executing the delivery order in `docs/frontend-feedback.md` §8. Each module is built to the
quality bar of the existing Tours vertical (entity → migration → DTOs → service → controller →
tests → seed → live verify), committed independently.

## Decisions on the §9 open questions (defaults for this academic build)

1. **Flights & Hotels** — first-party seeded inventory behind `FlightSearchPort` / `StaySearchPort`
   interfaces; no live GDS/aggregator. Flights keep `search → offer(expiry) → book`.
2. **Transport driver app** — out of scope. Drivers are seeded; dispatch is a stub that assigns the
   nearest seeded driver; driver movement is emitted via a server hook.
3. **Ride payment** — settle after `COMPLETED` (no upfront charge).
4. **AI planner** — stays grounded in tours only for now.
5. **SOS** — internal alert: record it, notify the user's emergency contacts by email (existing
   Brevo `MailService`), and always degrade to returning emergency numbers. Not wired to real
   emergency services.
6. **In-app chat** — out of scope; expose a masked driver phone for `tel:` only.
7. **Booking model** — new paid modules (Food/Hotels/Flights) use a generic polymorphic `Booking`
   reusing the single Paystack flow; the existing `tour_bookings` flow stays intact; `/bookings/me`
   returns a unified list. Rides are a separate stateful `/rides` resource, not a pay-upfront booking.

## Order & status

| # | Work | Status |
|---|------|--------|
| 1 | Fix `GET /bookings/me` 500 | ✅ done (TOUR-025) |
| 2 | Polymorphic `Booking` + embedded `item` | ⚠️ item embed done; generic Booking + payment generalisation pending (built with Food) |
| 3 | Geo (`distanceKm`) + `q=` on `/tours` | ⚠️ `q=` done; haversine helper done; `/places/search` deferred (per-endpoint proximity used instead) |
| 4 | **Emergency** | ✅ done (TOUR-027) — facilities (public, nearest-first), national numbers, idempotent SOS with contact notification + graceful degrade, emergency-contacts CRUD |
| 5 | Food | ⬜ |
| 6 | Hotels | ⬜ |
| 7 | Flights | ⬜ |
| 8 | Transport | ⬜ |
| + | Cross-cutting: Favourites, Notifications API, Reference data | ⬜ |

## Conventions (kept, per feedback §0)

Envelope `{code,message,data}`; pagination `page/limit → results/total/page/pageSize/totalPages`;
money in integer pesewas, `GHS`; ISO-UTC time; JWT + roles; detail-by-slug / relations-by-id;
error codes 400/401/403/404/409/502/503; Socket.IO `auth.token`. Public (no-auth) routes are the
emergency facility/contacts lookups.
