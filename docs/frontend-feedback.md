# API Requirements — the five unbacked modules

What the backend would need to expose to make Flights, Hotels, Food, Transport
and Emergency real. Written for the backend team.

Every field below is traced to something a **built screen already renders**
(see `docs/HANDOFF.md` route inventory) — this is not a wishlist, it's the
data those screens are currently faking with static content. Where a screen
shows something, it's cited.

> Current state: the live API implements **Tours only** (plus auth, payments,
> reviews, AI itineraries). See `docs/API_STATUS.md` for what works today.

---

## 0. Conventions to keep

Match the existing API exactly so the client stays uniform — the frontend's
`src/lib/api/client.ts` already assumes all of this:

- **Envelope:** `{ code, message, data }` on success *and* error.
- **Pagination:** `?page=&limit=` → `{ results, total, page, pageSize, totalPages }`.
- **Money:** integer **minor units** (pesewas), `currency: 'GHS'`. Never decimals.
  The UI's `formatMoney()` divides by 100. *(The static screens currently
  carry strings like `"GHS 850"` — those become `priceMinor: 85000`.)*
- **Time:** ISO 8601 UTC strings.
- **Auth:** JWT bearer, roles `TOURIST | OPERATOR | ADMIN`.
- **Detail routes by `slug`**, list/relations by `id` — as `/tours/:slug` vs
  `/tours/:id/departures` already do. The hotel and restaurant screens are
  already routed by slug (`/hotels/:slug`, `/food/:slug`).
- **Errors:** `400` validation (messages joined into one string), `401`, `403`,
  `404` (also for another user's resource), `409` conflict, `502` upstream
  provider failed, `503` integration not configured.
- **Sockets:** Socket.IO namespaces, `auth.token` handshake — extend the
  existing gateway rather than adding a second realtime transport.

---

## 1. The one decision that matters most: unify booking

**Do this before building any module.** Today `Booking` is tour-shaped — it
carries `departureId` and nothing else. If each of the five modules gets its
own booking + payment + cancellation flow, you end up with six parallel
implementations, six payment integrations, and a `/trips` screen that has to
merge six list endpoints.

Make **Booking polymorphic**: one resource, one payment flow, one history.

```ts
type BookableType = 'TOUR' | 'FLIGHT' | 'STAY' | 'TABLE' | 'RIDE';

interface Booking {
  reference: string;              // "TUR-2026-0007" — keep the existing scheme,
                                  // vary the prefix per type (FLT-, STY-, TBL-, RID-)
  itemType: BookableType;
  status: 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED';
  totalMinor: number;
  currency: 'GHS';
  createdAt: string;

  // ⚠️ THE IMPORTANT PART — a display summary embedded in the booking itself
  item: {
    id: string;
    slug?: string;
    title: string;                // "Cape Coast Castle Heritage Tour"
    subtitle?: string;            // "ACC → LOS · Direct" | "Deluxe Room · 2 guests"
    imageUrl?: string;
    startsAt?: string;            // departure / check-in / reservation time
    endsAt?: string;              // check-out
  };
}
```

**Why `item` matters:** `/trips` currently has to fetch *every* tour's
departures just to resolve one booking's title, because `Booking` only exposes
`departureId`. That's O(tours) requests per page load and it already doesn't
scale at 3 tours. Embedding the summary fixes the existing screen *and* makes
all five new modules work for free.

With that in place these keep working unchanged and cover every module:

| Endpoint | Note |
| --- | --- |
| `GET /bookings/me?page=&limit=&status=&type=` | add optional `type` filter for per-module tabs |
| `GET /bookings/:reference` | already works |
| `POST /bookings/:reference/cancel` | already works |
| `POST /payments/initiate` | already works — **no per-module payment needed** |
| `GET /payments/:reference/verify` | already works |
| socket `booking.status_changed` | already works |

> ⚠️ **`GET /bookings/me` currently returns 500 on every call**, including for
> accounts with zero bookings. Fix that first — it blocks `/trips` today and
> would block all five modules.

---

## 2. Cross-cutting services

These are needed by more than one module; build once.

### 2.1 Geo / proximity

Explore's Map View, Emergency's "Nearest facilities", Food's `distanceKm` and
Transport's driver matching all need the same thing.

```
GET /places/search?q=&lat=&lng=&radiusKm=&type=
```
`type: DESTINATION | HOTEL | RESTAURANT | FACILITY | AIRPORT`. Returns
`{ id, type, name, lat, lng, distanceKm }`. Every list endpoint below should
also accept `lat`, `lng`, `radiusKm` and return `distanceKm` when given them.

### 2.2 Text search on existing tours

`GET /tours` only filters by `destinationId`, `minPrice`, `maxPrice`, `sort`.
Explore's search box currently filters client-side over one page. Add `q=`.

### 2.3 Media uploads for TOURIST

`POST /uploads/image` is OPERATOR/ADMIN-only, so tourists can't set an avatar
(`PATCH /users/me` takes only a URL). Open it to TOURIST with a tighter rate
limit, or add `POST /users/me/avatar`.

### 2.4 Favourites

Profile has a "Saved Places" row, and the hotel detail page has a working
heart button with nowhere to persist to.

```
GET    /favorites?type=            → paginated, polymorphic like Booking.item
POST   /favorites { type, itemId }
DELETE /favorites/:id
```

### 2.5 Notifications

Profile has a "Notifications" row; the socket only carries booking and
availability events.

```
GET   /notifications?page=&limit=&unreadOnly=
POST  /notifications/:id/read
POST  /notifications/read-all
socket /notifications → notification.created
```

### 2.6 Reference data

Airports, cuisines, amenity keys, vehicle types, facility types — the UI
currently hardcodes all of these. `GET /reference/:set` returning
`{ code, label }[]` keeps client and server from drifting.

---

## 3. Module M2 — Flights

**Screens:** `/flights` (search form), `/flights/results` (offer list).

Fares and seat availability are volatile, so use the standard
**search → offer → book** shape rather than a plain resource list. Offers must
expire; never let the client book a stale price.

### Endpoints

```
GET  /flights/airports?q=                    → { code:"ACC", name, city, country }
POST /flights/search                         → { searchId, expiresAt, offers[] }
GET  /flights/offers/:offerId                → single offer, re-priced
POST /bookings  { itemType:'FLIGHT', offerId, passengers[] }
```

**Search body** — mirrors the form's controls exactly (trip-type toggle,
From/To, dates, passengers, cabin):

```ts
{
  tripType: 'ONE_WAY' | 'RETURN' | 'MULTI_CITY',
  slices: [{ origin: 'ACC', destination: 'LOS', date: '2026-05-25' }],
  passengers: { adults: number, children?: number, infants?: number },
  cabin: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST',
}
```

**Offer** — every field is on the results card today:

```ts
{
  offerId: string,
  airline: { code: string, name: string, logoUrl?: string },  // "Africa World Airlines"
  segments: [{
    origin: 'ACC', destination: 'LOS',
    departsAt: string, arrivesAt: string,                      // card shows 08:30 → 10:45
    flightNumber: string, durationMinutes: number,             // "2h 15m"
  }],
  stops: number,                                               // 0 renders as "Direct"
  totalMinor: number, currency: 'GHS',                         // "GHS 850"
  baggageKg?: number,                                          // "20kg baggage"
  refundable: boolean,                                         // "Refundable" chip
  amenities: string[],                                         // "Meal Included", "Priority boarding"
  expiresAt: string,
}
```

**Sorting** on the results screen is already built (`Price: Low to High`,
`Departure Time`) — accept `sort=price|-price|departsAt`.

Return `502` when the upstream GDS/aggregator fails, matching how the AI
planner already signals provider failure.

---

## 4. Module M3 — Hotels / Stays

**Screens:** `/hotels` (search + category pills + list), `/hotels/:slug`
(gallery, amenity grid, room picker, reviews, sticky Reserve bar).

Shapes already exist in `src/modules/accommodation/data.ts` — mirror them.

```
GET  /stays?q=&lat=&lng=&checkIn=&checkOut=&guests=&category=&minPrice=&maxPrice=&page=&limit=
GET  /stays/:slug
GET  /stays/:id/rooms?checkIn=&checkOut=&guests=      → live availability + rates
GET  /stays/:id/reviews?page=&limit=
POST /bookings { itemType:'STAY', roomId, checkIn, checkOut, guests }
```

```ts
interface Stay {
  id, slug, name: string,
  category: 'HOTEL'|'VILLA'|'HOSTEL'|'APARTMENT',   // the category pills
  location: string, lat: number, lng: number,        // "Labadi, Accra"
  stars: number,                                     // 1–5, the star row
  ratingAvg: number, ratingCount: number,            // the "4.8" badge
  fromPriceMinor: number, currency: 'GHS',           // "from GHS x / night"
  amenities: ('WIFI'|'POOL'|'BREAKFAST'|'PARKING'|…)[],  // amenity icon grid
  images: string[], description: string,
}

interface Room {
  id, name: string,            // "Deluxe Room"
  maxGuests: number, bed: string,
  pricePerNightMinor: number,
  available: boolean,
}
```

The category pills are currently inert because there's no category concept —
`category` above is what turns them on. Same pattern as Explore's dead
Attractions/Restaurants/Hotels pills.

---

## 5. Module M4 — Food & Drinks

**Screens:** `/food` (search, price/cuisine/dietary filters, list),
`/food/:slug` (tags, Menu/Reserve/Reviews/Info tabs, sticky Reserve a Table).

Shapes exist in `src/modules/food/data.ts`.

```
GET  /restaurants?q=&cuisine=&priceTier=&dietary=&lat=&lng=&openNow=&page=&limit=
GET  /restaurants/:slug
GET  /restaurants/:id/menu                → sections[] → items[]
GET  /restaurants/:id/reviews
GET  /restaurants/:id/availability?date=&partySize=   → bookable time slots
POST /bookings { itemType:'TABLE', restaurantId, at, partySize }
```

```ts
interface Restaurant {
  id, slug, name: string,
  cuisine: string, priceTier: 1|2|3|4,           // rendered as ₵–₵₵₵₵
  lat, lng: number, distanceKm?: number,         // list shows "1.2 km"
  ratingAvg: number, ratingCount: number,
  dietary: ('VEGETARIAN'|'VEGAN'|'HALAL'|'GLUTEN_FREE')[],   // dietary filter
  openingHours: { day: number, opens: string, closes: string }[],
  isOpenNow: boolean,                            // the Open/Closed badge
  images: string[],
}

interface MenuSection { category: string, items: { name, description, priceMinor }[] }
```

The cuisine filter already really filters the static list — it just needs a
server-side equivalent for real volume.

---

## 6. Module M5 — Transport

**Screens:** `/transport` (vehicle type, pickup/destination, now-vs-schedule,
estimated fare, Find a Driver, nearby drivers), `/transport/active-ride`
(live map, driver card, ETA, Chat/Call/Cancel).

This is the only module that is genuinely **stateful and realtime** — treat a
ride as a state machine, not a booking you pay for up front.

```
POST /rides/quote      { vehicleType, pickup:{lat,lng,label}, dropoff:{…}, scheduledAt? }
                       → { quoteId, fareMinor, etaMinutes, surgeMultiplier?, expiresAt }
GET  /rides/drivers/nearby?lat=&lng=&vehicleType=
                       → [{ id, name, vehicle, rating, etaMinutes, lat, lng }]
POST /rides            { quoteId }        → Ride (status REQUESTED)
GET  /rides/:id
POST /rides/:id/cancel
GET  /rides/me?status=
```

```ts
type RideStatus = 'REQUESTED'|'DRIVER_ASSIGNED'|'ARRIVING'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED';

interface Ride {
  id, status: RideStatus,
  vehicleType: 'TAXI'|'CAR_HIRE'|'SHUTTLE'|'BUS',   // the four pills
  pickup, dropoff: { lat, lng, label },
  fareMinor: number, currency: 'GHS',
  driver?: { id, name, phone, rating, vehicle: { make, model, plate, color } },
  driverLocation?: { lat, lng, bearing },
  etaMinutes?: number,                               // the "3 min away" pill
}
```

**Realtime — required, not optional.** The active-ride screen is meaningless
without it:

```
socket /rides
  client → ride.subscribe { rideId }
  server → ride.status_changed  { rideId, status, changedAt }
  server → ride.driver_moved    { rideId, lat, lng, bearing, etaMinutes }
```

Throttle `driver_moved` server-side (~1 event/3–5s) — don't stream raw GPS.

Payment differs from the other modules: fare is known only at completion, so
either authorise at request and capture at completion, or settle after
`COMPLETED`. Worth an explicit decision from the payments side.

Chat and Call are inert buttons today. Calling can be a `tel:` link if you
expose a masked driver number; in-app chat is a separate build — say if it's
in scope.

---

## 7. Module M6 — Emergency

**Screens:** `/emergency` (SOS button, Quick Actions grid, nearest facilities).

**Treat this differently from the other four — it is safety-critical** (SRS
FR-EMRG-*). Three specific requirements:

1. **Facility lookup must not require auth**, and must be fast. Someone in
   trouble may have an expired token. Cache-friendly and public.
2. **SOS must be idempotent** — a panicking user taps repeatedly. Take a
   client-generated `alertId` (UUID) and dedupe on it.
3. **SOS must degrade.** If dispatch integration is down, still record the
   alert and return the phone numbers to call. Never fail closed.

```
GET  /emergency/facilities?lat=&lng=&radiusKm=&type=     [public]
GET  /emergency/contacts?country=GH                       [public]
POST /emergency/sos   { alertId, lat, lng, kind, note? }
GET  /emergency/sos/:alertId
POST /emergency/sos/:alertId/cancel
GET/PUT /users/me/emergency-contacts
```

```ts
interface Facility {
  id, name: string,                                  // "Korle Bu Teaching Hospital"
  type: 'HOSPITAL'|'CLINIC'|'PHARMACY'|'POLICE'|'FIRE'|'EMBASSY',
  description: string,                               // "Emergency & Trauma Center"
  lat, lng: number, distanceKm: number,              // "0.9 km"
  phone: string, open24h: boolean,
}
```

Quick Actions map directly: **Call Ambulance** → national number from
`/emergency/contacts`; **Nearest Hospital** → top `facilities` hit (the card
already shows `0.9km · Korle Bu`); **My Embassy** → `type=EMBASSY` filtered by
the user's nationality (needs a `nationality` field on the user profile, which
doesn't exist yet); **Travel Advisory** → needs a small advisories endpoint or
a CMS feed.

---

## 8. Suggested delivery order

Sequenced by value-per-unit-of-work, not by module.

| # | Work | Why first |
| --- | --- | --- |
| 1 | **Fix `GET /bookings/me` (500)** | One endpoint; unblocks a finished screen today |
| 2 | **Polymorphic `Booking` + embedded `item`** | Removes the O(n) join; prerequisite for all five modules |
| 3 | Geo service + `q=` on `/tours` | Shared by Explore, Food, Emergency, Transport |
| 4 | **Emergency** | Smallest surface, safety-critical, mostly read-only, no payments |
| 5 | **Food** | Simple CRUD + a light reservation; no volatile pricing |
| 6 | **Hotels** | Real availability/rate logic, reuses the booking layer |
| 7 | **Flights** | Needs a third-party GDS; most external risk |
| 8 | **Transport** | Realtime + dispatch + driver-side app; effectively its own product |

Modules 4–6 reuse `POST /payments/initiate` untouched if step 2 lands first.

## 9. Open questions for the backend team

1. Are Flights/Hotels **first-party inventory or aggregated** from a third
   party? That decides whether offers need expiry and re-pricing (§3).
2. Transport needs a **driver-side app** to exist at all. Is that in scope, or
   is dispatch outsourced to an existing operator?
3. For rides, is payment **authorise-then-capture** or settle-after-completion?
4. Should the **AI planner** schedule hotels/food/transport once they exist?
   It's currently grounded in `APPROVED` tours only and strips anything else.
5. Does SOS need to reach **real emergency services**, or is it an internal
   alert to your own support desk? Very different compliance burden.
6. Is **in-app chat** (transport) in scope, or is a masked `tel:` link enough?

---

**Frontend readiness:** all five modules already have finished screens with
static content, so wiring each one is a small job once its endpoints exist —
swap the static array for a `useApiResource` call. The static data in
`src/modules/accommodation/data.ts` and `src/modules/food/data.ts` is real
Ghanaian content from the designs and can be used to seed.
