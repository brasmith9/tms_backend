# AI Itinerary Planning Engine — Design

Source feature: SRS FR-POI-08 ("Explore for me" / AI itinerary suggestion). Backend-only.

## Goal

Generate a multi-day Ghana travel itinerary for a tourist, **grounded in the real,
bookable tours in this system's database** rather than free-form LLM output. Persist each
generated itinerary so it can be retrieved and (later) shared.

## Grounding — the core idea

Generation is retrieval-augmented, not open-ended:

1. **Retrieve** — given a destination and preferences, query APPROVED `Tour`s (with their
   cheapest scheduled `TourDeparture` price), capped at 20, to bound the prompt.
2. **Prompt** — hand the LLM *only* those real tours (id, title, destination, price in GHS,
   duration) and instruct it to build the day-by-day plan around them, referencing exact
   `tourId`s for bookable items. It may add meals / free-time / local tips as **non-bookable**
   items.
3. **Validate** — every `tourId` the model returns is checked against the candidate set.
   Hallucinated ids are dropped and their item downgraded to a non-bookable `TIP`. This is what
   keeps the output honest and safe to surface to the frontend.
4. **Persist & return** in the standard response envelope.

If no APPROVED tours match the destination, generation still succeeds with an all-non-bookable
plan (the LLM plans around general knowledge), and the response notes that no bookable tours
were found.

## Module

New `itineraries` module: `ItinerariesController`, `ItinerariesService`, `ItinerariesRepository`,
`Itinerary` entity, DTOs, and an `ItineraryPlannerPort` behind which the OpenRouter client sits.

The service depends on the **port interface**, not the concrete client (mirrors the
`SEAT_COUNTER` pattern), so unit tests inject a fake planner and never hit the network.

## Endpoints (all `/api/v1`, JWT-authenticated)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/itineraries/generate` | TOURIST | Generate, persist, return an itinerary |
| GET | `/itineraries` | any authed | Paginated list of *my* itineraries |
| GET | `/itineraries/:id` | owner/admin | Fetch one of mine (OwnershipGuard) |
| DELETE | `/itineraries/:id` | owner/admin | Delete one of mine |

`GET`/`DELETE /:id` reuse the existing `OwnershipGuard` + `OWNER_RESOLVER` (the service resolves
`ownerIdFor(id) -> userId`).

## `Itinerary` entity (`itineraries` table)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid, indexed | owner |
| title | varchar | LLM-generated headline |
| destination_name | varchar | echoed request destination |
| days | int | 1–14 |
| budget_minor | int, nullable | GHS pesewas |
| party_size | int, default 1 | |
| interests | jsonb | string[] |
| plan | jsonb | structured plan (below) |
| model | varchar | model id that produced it (traceability) |
| created_at | timestamptz | |

### `plan` jsonb shape

```jsonc
{
  "summary": "string",
  "estimatedTotalMinor": 0,          // optional, GHS pesewas
  "notes": ["string"],               // optional
  "days": [
    {
      "day": 1,
      "title": "string",
      "items": [
        {
          "period": "morning" | "afternoon" | "evening",
          "kind": "TOUR" | "MEAL" | "FREE" | "TIP",
          "title": "string",
          "description": "string",
          "tourId": "uuid",          // only when kind=TOUR and validated
          "tourSlug": "string",      // only when kind=TOUR and validated
          "estimatedCostMinor": 0,   // optional
          "bookable": true           // true only for validated TOUR items
        }
      ]
    }
  ]
}
```

## Request DTO — `GenerateItineraryDto`

- `destination: string` — required, 2–120 chars (matched case-insensitively against
  `Destination.name`; if unmatched we still plan, just without grounded tours).
- `days: number` — required int, 1–14.
- `budgetMinor?: number` — optional int ≥ 0.
- `partySize?: number` — optional int 1–20, default 1.
- `interests?: string[]` — optional, each 1–40 chars, max 10.

## OpenRouter client — `OpenRouterPlanner` (implements `ItineraryPlannerPort`)

Mirrors `paystack.client.ts` / `storage.service.ts`:

- Reads a new `ai` config section: `apiKey` (`AI_OPENROUTE_API_KEY`), `model`
  (`AI_OPENROUTE_MODEL`, default `anthropic/claude-3.5-sonnet`), `baseUrl`
  (`AI_OPENROUTE_BASE_URL`, default `https://openrouter.ai/api/v1`), `timeoutMs`
  (`AI_OPENROUTE_TIMEOUT_MS`, default 120000 — high enough for slow free-tier models observed to
  take ~75s; lower it when using a fast model). The deadline is enforced with
  `AbortSignal.timeout(timeoutMs)` in addition to axios' own `timeout`, since a provider that holds
  the connection open while queueing can otherwise defeat the latter.
- POSTs to `/chat/completions` with `response_format: { type: 'json_object' }`, a system prompt
  describing the schema + grounding rules, and a user message carrying the request + candidate
  tours. Sends OpenRouter's recommended `HTTP-Referer` and `X-Title` headers.
- **Throws `ServiceUnavailableException` (503)** when `apiKey` is empty (same graceful-degradation
  posture as Cloudinary/Brevo — `AI_OPENROUTE_API_KEY` stays optional in env validation).
- On network error or unparseable JSON, retries **once**; if it still fails, throws
  `BadGatewayException` (502). The global exception filter renders both in the envelope.

The port contract:

```ts
interface PlannerRequest {
  destination: string;
  days: number;
  budgetMinor?: number;
  partySize: number;
  interests: string[];
  candidateTours: CandidateTour[]; // {id, slug, title, destinationName, priceMinor, durationMinutes}
}
interface ItineraryPlannerPort {
  plan(req: PlannerRequest): Promise<RawPlan>; // RawPlan = the plan jsonb shape, unvalidated
}
```

The **service** owns retrieval, tourId validation, persistence — all pure and unit-testable. The
**client** owns only the HTTP + JSON-parse concern.

## Cross-cutting

- **Synchronous** generation: the request blocks until the model responds. Latency is
  model-dependent — a fast paid model returns in a few seconds; `openrouter/free` was measured at
  ~75s. Async/queue is a documented Phase-2 deferral (see ADR).
- Standard response envelope + `@ApiEnvelopeResponse` / `@ApiPaginatedResponse` Swagger + a
  `@ResponseMessage('Itinerary generated')` on the generate route.
- TypeORM migration `Itineraries<ts>` adds the table; `migrationsRun` applies it on boot.
- Registered in `AppModule`. Config gains the `ai` section; `.env.example` gains
  `AI_OPENROUTE_API_KEY`, `AI_OPENROUTE_MODEL`, `AI_OPENROUTE_BASE_URL` placeholders.

## Testing

Unit only (matches the repo's per-module unit-test convention; no live-network e2e):

**`OpenRouterPlanner`** (mock the HTTP layer):
- builds the request with model, JSON response_format, auth + referer headers, candidate tours in
  the payload;
- parses a well-formed JSON completion into `RawPlan`;
- throws 503 when unconfigured;
- retries once then throws 502 on persistent malformed JSON / network error.

**`ItinerariesService`** (fake `ItineraryPlannerPort` + mocked repo/tours):
- retrieves candidate tours for the destination and passes them to the planner;
- keeps a `TOUR` item whose `tourId` is in the candidate set (bookable=true);
- drops/downgrades a `TOUR` item whose `tourId` is hallucinated (not in candidates);
- persists with the resolved `model`, `userId`, and echoed request fields;
- `ownerIdFor` returns the owning `userId` (and null when absent);
- succeeds with an all-non-bookable plan when no tours match.

## Non-goals (deferred)

- Async job queue / polling for generation.
- Editing a saved itinerary, or booking directly from an itinerary item.
- Sharing / public itinerary links (SRS FR-SOC-05) — the persisted entity is the foundation for it.
- Streaming the LLM response.
