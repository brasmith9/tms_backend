# Voyago Backend — Frontend Integration Guide

This is the single source of truth for integrating a frontend with the Voyago (Ghana tourism)
backend. It covers the request/response conventions, authentication, every REST endpoint, the
real-time WebSocket contracts, and the AI itinerary engine. Give this file to your model/agent as
context.

> Scope note: this backend implements **one vertical end-to-end — Tours & Booking** — plus auth,
> profiles, payments, reviews, uploads, real-time notifications, and an AI itinerary planner. Other
> tourism verticals (flights, hotels, food, transport, emergency) are **not** implemented.

---

## 1. Basics

- **Base URL:** `http://localhost:3000` in local dev. All routes are prefixed and versioned:
  **every endpoint lives under `/api/v1`**. Example: `POST http://localhost:3000/api/v1/auth/login`.
- **Content type:** `application/json` for everything **except** image upload, which is
  `multipart/form-data`.
- **Interactive API docs (Swagger):** `GET /api/docs` — live, reflects the running build. Sockets
  are not in Swagger; see §7.
- **CORS:** the server allows the origins configured in its `CORS_ORIGINS` env var. Ask the backend
  team to add your dev origin (e.g. `http://localhost:5173`).
- **Auth scheme:** JWT Bearer. Send `Authorization: Bearer <accessToken>` on protected routes.

---

## 2. Uniform response envelope

**Every successful response** is wrapped in this envelope:

```json
{
  "code": 200,
  "message": "OK",
  "data": <payload or null>
}
```

- `code` mirrors the HTTP status (`200`, `201`, …).
- `message` is a human string. Default is `"OK"` (or `"Created"` for 201); many endpoints set a
  specific message (e.g. `"Itinerary generated"`, `"Logged out"`).
- `data` holds the actual payload. For endpoints that return nothing (logout, deletes), `data` is
  `null`.

Your client should **unwrap `.data`** for the payload and can surface `.message` in toasts.

### Paginated payloads

List endpoints put a pagination object in `data`:

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "results": [ /* array of items */ ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

Request pagination with query params `?page=1&limit=20` (defaults: `page=1`, `limit=20`, max
`limit=100`).

---

## 3. Errors

**Every error** uses the same envelope with `data: null`:

```json
{ "code": 404, "message": "Tour abc not found", "data": null }
```

- **Validation errors (`400`)** — all field messages are joined into one string:
  `{ "code": 400, "message": "days must not be less than 1; destination should not be empty", "data": null }`.
  Unknown/extra body fields are rejected (the API whitelists DTO fields).
- **`401`** — missing/invalid/expired access token on a protected route.
- **`403`** — authenticated but wrong role, or not the owner of the resource.
- **`404`** — resource not found (also returned instead of `403` when you request another user's
  private resource, e.g. someone else's itinerary).
- **`409`** — conflict (e.g. duplicate email on register, unique-constraint violations).
- **`500`** — unexpected server error; message is always the generic `"Internal server error"`
  (internal details are never leaked).
- **`502`** — the AI provider failed to produce a plan (see §8).
- **`503`** — an external integration is not configured on the server (Cloudinary uploads, or the
  AI planner without an API key).

---

## 4. Authentication & roles

### Roles

`TOURIST` · `OPERATOR` · `ADMIN`. Public sign-up (`/auth/register`) always creates a **TOURIST**.
Operator and admin accounts are provisioned by the backend (seeded), not self-service. There is
currently **no email-verification step** — register returns tokens immediately.

### Token model

- **Access token** — short-lived JWT, sent as `Authorization: Bearer <token>` on every protected
  REST call and on socket handshakes (§7).
- **Refresh token** — long-lived; exchange it for a fresh pair. **Refresh rotates**: each call to
  `/auth/refresh` invalidates the old refresh token and returns a new pair. Store the newest one.

Both are returned together as:

```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

Recommended client flow: on a `401`, call `/auth/refresh` once with the stored refresh token; on
success retry the original request; on failure send the user to login.

### Auth endpoints (`/api/v1/auth`)

| Method | Path | Body | `data` returned | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `{ email, password (8–128), fullName (2–120) }` | `{ accessToken, refreshToken }` | Creates a TOURIST. `409` if email exists. |
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, refreshToken }` | `401` on bad credentials. |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` | Rotates the refresh token. |
| POST | `/auth/logout` | `{ refreshToken }` | `null` | Revokes that refresh token. |
| POST | `/auth/forgot-password` | `{ email }` | `null` | Always 200 (no account enumeration). Emails a reset link if the account exists. |
| POST | `/auth/reset-password` | `{ token, password (8–128) }` | `null` | `token` comes from the emailed link. Single-use. |

---

## 5. Core object shapes

Reused across endpoints (these are the `data` payloads, already unwrapped from the envelope).

**User**
```ts
{ id: string, email: string, fullName: string, phone?: string, avatarUrl?: string,
  role: 'TOURIST'|'OPERATOR'|'ADMIN', loyaltyPoints: number }
```

**Destination**
```ts
{ id: string, name: string, region: string, country: string, description: string,
  heroImageUrl?: string, lat?: number, lng?: number }
```

**Tour**
```ts
{ id: string, operatorId: string, destinationId: string, title: string, slug: string,
  description: string, priceMinor: number, currency: 'GHS', durationMinutes: number,
  status: 'DRAFT'|'PENDING_REVIEW'|'APPROVED'|'SUSPENDED',
  heroImageUrl?: string, ratingAvg: number, ratingCount: number }
```

**Departure**
```ts
{ id: string, tourId: string, departsAt: string /* ISO */, capacity: number,
  seatsLeft: number, status: 'SCHEDULED'|'CANCELLED' }
```

**Booking**
```ts
{ reference: string /* e.g. "TUR-2026-0007" */, departureId: string, seats: number,
  totalMinor: number, currency: 'GHS',
  status: 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED', createdAt: string /* ISO */,
  // Embedded tour summary so trips lists render without fetching each tour:
  item?: { id: string, slug: string, title: string, imageUrl?: string, startsAt?: string /* ISO */ } }
```

**Payment**
```ts
{ providerRef: string, status: 'PENDING'|'PAID'|'FAILED'|'REFUNDED',
  amountMinor: number, currency: string, authorizationUrl?: string }
```

**Review**
```ts
{ id: string, tourId: string, authorId: string, rating: number /* 1–5 */,
  body: string, createdAt: string /* ISO */ }
```

**Itinerary** — see §8.

### Money

All money is an **integer in minor units (pesewas)**. `priceMinor: 12000` means **GHS 120.00**.
Divide by 100 for display. Currency is `GHS` throughout.

---

## 6. REST endpoints by module

Legend for **Auth**: `public` = no token · `TOURIST`/`OPERATOR`/`ADMIN` = that role required ·
`owner` = must own the resource.

### Users (`/api/v1/users`)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| GET | `/users/me` | any authed | — | **User** |
| PATCH | `/users/me` | any authed | `{ fullName?, phone?, avatarUrl? }` | **User** |
| GET | `/users/me/loyalty` | any authed | — | `{ points: number, tier: 'BRONZE'|'SILVER'|'GOLD'|'PLATINUM' }` |

Loyalty tiers: `BRONZE` (<500), `SILVER` (≥500), `GOLD` (≥1000), `PLATINUM` (≥5000). `avatarUrl`
must be a valid URL — see §9 for how to obtain one.

### Destinations (`/api/v1/destinations`)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| GET | `/destinations?page=&limit=` | public | — | paginated **Destination** |
| GET | `/destinations/:id` | public | — | **Destination** |
| POST | `/destinations` | ADMIN | `{ name, region, country?, description, heroImageUrl?, lat?, lng? }` | **Destination** |
| PATCH | `/destinations/:id` | ADMIN | partial of create | **Destination** |
| DELETE | `/destinations/:id` | ADMIN | — | `null` |

### Tours (`/api/v1/tours`)

| Method | Path | Auth | Body / Query | `data` |
|---|---|---|---|---|
| GET | `/tours` | public | query: `page,limit,q?,destinationId?,minPrice?,maxPrice?,sort?` | paginated **Tour** (APPROVED only) |
| GET | `/tours/:slug` | public | — | **Tour** (APPROVED only; by slug) |
| POST | `/tours` | OPERATOR | `{ title, destinationId, description, priceMinor, durationMinutes, heroImageUrl? }` | **Tour** (status `DRAFT`) |
| PATCH | `/tours/:id` | OPERATOR + owner | partial (not `destinationId`) | **Tour** |
| POST | `/tours/:id/submit` | OPERATOR + owner | — | **Tour** (→ `PENDING_REVIEW`) |
| POST | `/tours/:id/approve` | ADMIN | — | **Tour** (→ `APPROVED`) |
| POST | `/tours/:id/suspend` | ADMIN | — | **Tour** (→ `SUSPENDED`) |
| GET | `/tours/:id/departures` | public | — | **Departure[]** (with live `seatsLeft`) |
| POST | `/tours/:id/departures` | OPERATOR + owner | `{ departsAt (ISO), capacity (≥1) }` | **Departure** |

`sort` accepts `price` \| `-price` \| `title`. `q` is a free-text search over title/description
(case-insensitive). Public listing/detail only ever returns `APPROVED` tours; the
DRAFT→PENDING_REVIEW→APPROVED lifecycle is operator/admin-facing.

### Reviews (`/api/v1`)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| GET | `/tours/:id/reviews?page=&limit=` | public | — | paginated **Review** |
| POST | `/bookings/:reference/review` | TOURIST | `{ rating (1–5), body (3–2000) }` | **Review** |

A review can only be posted for a booking whose status is `COMPLETED` (i.e. the trip happened).
Posting a review updates the tour's `ratingAvg`/`ratingCount`.

### Bookings (`/api/v1/bookings`)

| Method | Path | Auth | Body / Query | `data` |
|---|---|---|---|---|
| POST | `/bookings` | TOURIST | `{ departureId, seats (1–20) }` | **Booking** (status `PENDING`) |
| GET | `/bookings/me` | any authed | query: `page,limit,status?` | paginated **Booking** |
| GET | `/bookings/:reference` | owner | — | **Booking** |
| POST | `/bookings/:reference/cancel` | TOURIST | — | **Booking** (status `CANCELLED`) |

`status` filter on `/bookings/me` is one of `upcoming` \| `completed` \| `cancelled` (maps to the
UI tabs). Every booking response embeds an `item` summary (tour `id`, `slug`, `title`, `imageUrl`,
`startsAt`), so a trips list renders in a single call — no per-booking tour fetches. See the
lifecycle below.

### Payments (`/api/v1/payments`)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| POST | `/payments/initiate` | any authed | `{ bookingReference }` | **Payment** (with `authorizationUrl`) |
| GET | `/payments/:reference/verify` | any authed | — | **Payment** |
| POST | `/payments/webhook` | Paystack only | (raw Paystack event) | — |

The **webhook is server-to-server** (called by Paystack, HMAC-verified). **Your frontend never
calls it.** `bookingReference` must match `TUR-YYYY-NNNN`.

### Uploads (`/api/v1/uploads`)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| POST | `/uploads/image` | any authed role (incl. TOURIST) | `multipart/form-data`, field `file` (image) | `{ url, publicId }` |

Returns the hosted Cloudinary URL. `400` if the file isn't an image; `503` if Cloudinary isn't
configured on the server. Tourists can now use this to upload an avatar, then send the returned
`url` to `PATCH /users/me` as `avatarUrl`.

---

## 7. The booking → payment → confirmation lifecycle

This is the most important multi-step flow. Bookings use **seat holds** and are confirmed by
payment, with real-time status pushed over sockets.

1. **Create booking** — `POST /bookings { departureId, seats }`. Returns a **Booking** with status
   `PENDING`. Seats are **held** for a limited window (server-configured, ~15 min). Concurrently:
   - a `booking.status_changed` (`PENDING`) socket event fires to the tourist;
   - an `availability.changed` event fires to everyone watching that departure.
2. **Initiate payment** — `POST /payments/initiate { bookingReference }`. Returns a **Payment**
   with `authorizationUrl`. **Redirect the user to `authorizationUrl`** (Paystack checkout).
3. **User pays on Paystack.** Paystack calls the backend webhook directly. On success the backend
   sets the booking to `CONFIRMED` and the payment to `PAID`, and emits `booking.status_changed`
   (`CONFIRMED`). Your app learns of confirmation via **the socket** (preferred) or by polling
   `GET /payments/:reference/verify` / `GET /bookings/:reference`.
4. **If not paid in time**, a scheduled job cancels the hold: booking → `CANCELLED`, with
   `booking.status_changed` (`CANCELLED`) and `availability.changed` emitted.
5. **Cancel** — `POST /bookings/:reference/cancel` sets `CANCELLED` (a refund is issued when
   cancelled within the server's refund window).
6. **Completion** — after the departure occurs, a scheduled job marks the booking `COMPLETED`,
   awards loyalty points, and emits `booking.status_changed` (`COMPLETED`). Only then can the user
   review it.

Client guidance: after step 1, open a `/bookings` socket and react to `booking.status_changed` to
drive the UI from `PENDING` → `CONFIRMED` without polling.

---

## 8. Real-time (WebSocket / Socket.IO)

Transport is **Socket.IO** (not raw WebSocket). Two namespaces. Both share the same host as REST.
Authenticate the handshake with the **same access token** used for REST, passed as `auth.token`.

```js
import { io } from 'socket.io-client';

// Booking status updates for the signed-in user
const bookings = io('http://localhost:3000/bookings', { auth: { token: accessToken } });

// Live seat availability for departures the user is browsing
const availability = io('http://localhost:3000/availability', { auth: { token: accessToken } });
```

### `/bookings` namespace

Auth is **required** — an unauthenticated handshake is disconnected immediately. On connect you are
auto-joined to your own room; no subscribe message needed.

| Direction | Event | Payload |
|---|---|---|
| server → client | `booking.status_changed` | `{ reference: string, status: 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED', changedAt: string /* ISO */ }` |

Always emitted **after** the database transaction commits, so the status is authoritative.

### `/availability` namespace

Opt in per departure to watch its remaining seats drop as others book.

| Direction | Event | Payload |
|---|---|---|
| client → server | `departure.subscribe` | `{ departureId: string }` |
| client → server | `departure.unsubscribe` | `{ departureId: string }` |
| server → client | `availability.changed` | `{ departureId: string, seatsLeft: number, capacity: number }` |

```js
availability.emit('departure.subscribe', { departureId });
availability.on('availability.changed', ({ departureId, seatsLeft, capacity }) => { /* update UI */ });
```

---

## 9. AI itinerary planner

Generates a day-by-day Ghana itinerary, **grounded in the real APPROVED tours in the system** — the
model plans around actual bookable tours and references their real ids, so bookable items deep-link
straight into the booking flow. Invented tours are stripped out server-side.

> **No streaming.** This is a **standard synchronous REST call** — there is **no token streaming and
> no socket channel for AI**. The request **holds open until the full plan is ready**. Latency is
> model-dependent: a fast model returns in a few seconds; the free tier currently configured has
> been measured at **~75 seconds**. Show a loading state and set a generous client timeout (≥ ~90s
> to be safe). The backend enforces its own timeout and returns `502` if the model ultimately fails.

### Endpoints (`/api/v1/itineraries`, all require auth)

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| POST | `/itineraries/generate` | TOURIST | see below | **Itinerary** (message: `"Itinerary generated"`, HTTP `201`) |
| GET | `/itineraries?page=&limit=` | any authed | — | paginated **Itinerary** (yours only) |
| GET | `/itineraries/:id` | owner | — | **Itinerary** (`404` if not yours) |
| DELETE | `/itineraries/:id` | owner | — | `null` (message: `"Itinerary deleted"`) |

**Generate request body:**
```ts
{
  destination: string,        // required, 2–120 chars, e.g. "Cape Coast"
  days: number,               // required, 1–14
  budgetMinor?: number,       // optional, GHS pesewas (≥ 0)
  partySize?: number,         // optional, 1–20, default 1
  interests?: string[]        // optional, up to 10, each 1–40 chars, e.g. ["history","beaches"]
}
```

Errors specific to this endpoint: `400` invalid input; `502` model failed after retry; `503` if the
server has no AI key configured.

### Itinerary object shape (`data`)

```ts
{
  id: string,
  title: string,               // model-generated headline
  destinationName: string,
  days: number,
  budgetMinor?: number,
  partySize: number,
  interests: string[],
  model: string,               // model id that produced it
  createdAt: string,           // ISO
  plan: {
    summary: string,
    estimatedTotalMinor?: number,   // GHS pesewas
    notes?: string[],
    days: [
      {
        day: number,           // 1-based
        title: string,
        items: [
          {
            period: 'morning' | 'afternoon' | 'evening',
            kind: 'TOUR' | 'MEAL' | 'FREE' | 'TIP',
            title: string,
            description: string,
            estimatedCostMinor?: number,   // GHS pesewas
            bookable: boolean,             // true ONLY for validated TOUR items
            tourId?: string,               // present & real when bookable === true
            tourSlug?: string              // present when bookable === true
          }
        ]
      }
    ]
  }
}
```

**Rendering guidance:**
- Group items under `plan.days[].items[]` by `period`.
- When `item.bookable === true`, render a "Book this tour" action — `item.tourId` is a real tour
  you can send into the booking flow (fetch details via `GET /tours/:slug` using `item.tourSlug`,
  then list departures via `GET /tours/:id/departures`).
- When `item.bookable === false` (`MEAL`/`FREE`/`TIP`, or a downgraded tour), render it as
  informational only — no booking action, no assumption that `tourId` exists.
- If the destination had no matching approved tours, you still get a valid plan made entirely of
  non-bookable items.

---

## 9b. Emergency (M6)

Safety-critical. Facility and number lookups are **public (no auth)** so they work even with an
expired token; SOS and contacts require auth.

### Endpoints (`/api/v1`)

| Method | Path | Auth | Query / Body | `data` |
|---|---|---|---|---|
| GET | `/emergency/facilities` | **public** | `lat?, lng?, radiusKm?, type?, country?` | **Facility[]** |
| GET | `/emergency/contacts` | **public** | `country?` (default `GH`) | `{ label, number }[]` |
| POST | `/emergency/sos` | any authed | `{ alertId (uuid), lat, lng, kind, note? }` | **Sos** |
| GET | `/emergency/sos/:alertId` | owner | — | **Sos** |
| POST | `/emergency/sos/:alertId/cancel` | owner | — | **Sos** |
| GET | `/users/me/emergency-contacts` | any authed | — | **EmergencyContact[]** |
| PUT | `/users/me/emergency-contacts` | any authed | `{ contacts: EmergencyContact[] }` (max 10) | **EmergencyContact[]** |

```ts
Facility = { id, name, type: 'HOSPITAL'|'CLINIC'|'PHARMACY'|'POLICE'|'FIRE'|'EMBASSY',
             description, lat, lng, phone, open24h, distanceKm? /* present when lat/lng given */ }
Sos      = { alertId, status: 'ACTIVE'|'CANCELLED'|'RESOLVED', kind: 'MEDICAL'|'SECURITY'|'FIRE'|'OTHER',
             lat, lng, note?, notifiedContacts, createdAt, emergencyNumbers: {label,number}[] }
EmergencyContact = { id, name, phone, email?, relationship? }
```

**Behaviour to rely on:**
- `facilities` are returned **nearest-first with `distanceKm`** when you pass `lat`+`lng`; add
  `radiusKm` to cap, `type` to filter (e.g. `type=EMBASSY` for "My Embassy"). Without lat/lng you
  get the full list and no `distanceKm`.
- **SOS is idempotent on `alertId`** — send a client-generated UUID; repeated taps return the same
  alert and do not re-notify. It **never fails closed**: `emergencyNumbers` is always returned even
  if contact notification breaks.
- Contact notification is currently **email-only** (SMS/Twilio isn't wired), so only contacts with
  an `email` are reached; `notifiedContacts` reflects how many. Quick Actions: **Call Ambulance** →
  a number from `/emergency/contacts`; **Nearest Hospital** → top `facilities?type=HOSPITAL` hit;
  **My Embassy** → `facilities?type=EMBASSY`.

## 10. Known gaps & gotchas (read before building)

1. **Avatar upload** *(resolved)* — `POST /uploads/image` now accepts the TOURIST role, so the
   intended flow works: upload the image, then send the returned `url` to `PATCH /users/me` as
   `avatarUrl`.
2. **AI is synchronous and can be slow.** Reiterating §9: no streaming; budget for ~75s on the
   current free model and show a spinner. Ask the backend team to switch to a faster model for demos.
3. **Only the Tours vertical exists.** There are no flight/hotel/food/transport/emergency endpoints.
   Don't build UI expecting them.
4. **Money is always integer pesewas.** Never send/expect decimals for amounts.
5. **Payment confirmation is asynchronous.** After redirecting to Paystack, confirmation arrives via
   the webhook → socket, not as the direct response to any call your frontend makes. Drive the UI
   off `booking.status_changed` or poll `GET /payments/:reference/verify`.
6. **Refresh tokens rotate.** Always persist the newest `refreshToken` from `/auth/refresh`; the old
   one stops working.

---

## 11. Quick reference — enums

| Enum | Values |
|---|---|
| User role | `TOURIST`, `OPERATOR`, `ADMIN` |
| Loyalty tier | `BRONZE`, `SILVER`, `GOLD`, `PLATINUM` |
| Tour status | `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `SUSPENDED` |
| Departure status | `SCHEDULED`, `CANCELLED` |
| Booking status | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| Payment status | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| Itinerary item `period` | `morning`, `afternoon`, `evening` |
| Itinerary item `kind` | `TOUR`, `MEAL`, `FREE`, `TIP` |
