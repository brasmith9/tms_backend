# ADR 0001 — Grounded itinerary planning via OpenRouter

- Status: Accepted
- Date: 2026-07-30

## Context

FR-POI-08 calls for an AI "Explore for me" itinerary generator. We need an LLM to produce
day-by-day plans, but the plans must reference the tours that actually exist and are bookable in
this system — not invented places or prices.

## Decision

1. **Provider: OpenRouter** (`AI_OPENROUTE_API_KEY`, model configurable via `AI_OPENROUTE_MODEL`,
   default `anthropic/claude-3.5-sonnet`). One HTTP surface gives access to many models and lets us
   swap models without code change. No self-hosted inference.
2. **Retrieval-grounded generation.** We fetch APPROVED tours matching the destination from
   Postgres and pass them to the model as the only bookable inventory; every `tourId` the model
   returns is validated against that set and hallucinated ids are downgraded to non-bookable tips.
   This is a plain SQL fetch + application-level validation — no vector store, which is
   unwarranted at this catalogue size (the same Postgres-native-over-heavier-infra stance the SRS
   adaptation takes elsewhere).
3. **Synchronous request/response.** Generation blocks the HTTP call (~5–15s, 20s timeout). A job
   queue with polling is deferred until latency or load makes it necessary.
4. **Graceful degradation.** When the API key is absent the planner throws 503 (like Cloudinary /
   Brevo), so the rest of the system boots and runs without AI configured. The key stays optional
   in env validation.

## Consequences

- The frontend gets itineraries whose bookable items map to real tour ids it can deep-link to
  booking.
- Model quality/cost is a config knob, not a code change.
- Synchronous generation ties up a request for seconds; acceptable at current scale, revisit under
  load (Phase 2).
- No provider lock-in beyond the OpenRouter request shape, which is OpenAI-compatible.
