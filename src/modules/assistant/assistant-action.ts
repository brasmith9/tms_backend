/**
 * The closed set of things the assistant may ask the client to do, matching the
 * union in `docs/api-requirements.md` §C verbatim — the client executes these
 * with a `switch`, so the shape is a contract, not a suggestion. Free text is
 * never actionable.
 */
export type AssistantAction =
  | { type: 'OPEN_LOCATION'; slug: string; name: string }
  | { type: 'OPEN_FOOD_JOINT'; slug: string; name: string }
  | { type: 'SHOW_DIRECTIONS'; lat: number; lng: number; name: string }
  | {
      type: 'CONTACT_FOOD_JOINT';
      slug: string;
      name: string;
      channel: 'CALL' | 'WHATSAPP';
    }
  | {
      type: 'SAVE_FAVORITE';
      favoriteType: 'LOCATION' | 'FOOD_JOINT';
      itemId: string;
      name: string;
    };

export type AssistantActionType = AssistantAction['type'];

export const ASSISTANT_ACTION_TYPES: readonly AssistantActionType[] = [
  'OPEN_LOCATION',
  'OPEN_FOOD_JOINT',
  'SHOW_DIRECTIONS',
  'CONTACT_FOOD_JOINT',
  'SAVE_FAVORITE',
] as const;

/** A real record the model was shown, flattened to what an action can carry. */
export interface GroundedPlace {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Vendor consented and a number is on file. Food joints only. */
  canCall?: boolean;
  canWhatsApp?: boolean;
}

export interface GroundingIndex {
  locations: GroundedPlace[];
  foodJoints: GroundedPlace[];
}

interface Lookups {
  locationBySlug: Map<string, GroundedPlace>;
  locationById: Map<string, GroundedPlace>;
  foodBySlug: Map<string, GroundedPlace>;
  foodById: Map<string, GroundedPlace>;
  /** Every candidate keyed by normalised name, for SHOW_DIRECTIONS. */
  byName: Map<string, GroundedPlace>;
}

const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function index(sets: GroundingIndex): Lookups {
  const byName = new Map<string, GroundedPlace>();
  for (const p of [...sets.locations, ...sets.foodJoints]) {
    byName.set(normalise(p.name), p);
  }
  return {
    locationBySlug: new Map(sets.locations.map((l) => [l.slug, l])),
    locationById: new Map(sets.locations.map((l) => [l.id, l])),
    foodBySlug: new Map(sets.foodJoints.map((f) => [f.slug, f])),
    foodById: new Map(sets.foodJoints.map((f) => [f.id, f])),
    byName,
  };
}

/**
 * Narrows one untrusted value from the model to a real action, or null.
 *
 * Three things have to hold: the shape must match the union exactly; every id
 * or slug must belong to a record the model was actually given; and every
 * human-facing field the client renders — `name`, and the `lat`/`lng` a map pin
 * uses — is **overwritten from the resolved record** rather than trusted. So
 * even a well-formed action cannot carry an invented name or a wrong coordinate.
 */
export function parseAction(
  value: unknown,
  lookups: Lookups,
): AssistantAction | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  switch (raw.type) {
    case 'OPEN_LOCATION': {
      const place = resolve(raw.slug, lookups.locationBySlug);
      return place
        ? { type: 'OPEN_LOCATION', slug: place.slug, name: place.name }
        : null;
    }
    case 'OPEN_FOOD_JOINT': {
      const place = resolve(raw.slug, lookups.foodBySlug);
      return place
        ? { type: 'OPEN_FOOD_JOINT', slug: place.slug, name: place.name }
        : null;
    }
    case 'SHOW_DIRECTIONS': {
      // The union carries no id, so the name is the only handle back to a real
      // record. Coordinates always come from that record, never from the model.
      if (typeof raw.name !== 'string') return null;
      const place = lookups.byName.get(normalise(raw.name));
      if (!place) return null;
      return {
        type: 'SHOW_DIRECTIONS',
        lat: place.lat,
        lng: place.lng,
        name: place.name,
      };
    }
    case 'CONTACT_FOOD_JOINT': {
      const place = resolve(raw.slug, lookups.foodBySlug);
      if (!place) return null;
      const channel = raw.channel;
      // The consent gate applies to actions too: no published channel, no button.
      if (channel === 'CALL' && place.canCall) {
        return {
          type: 'CONTACT_FOOD_JOINT',
          slug: place.slug,
          name: place.name,
          channel,
        };
      }
      if (channel === 'WHATSAPP' && place.canWhatsApp) {
        return {
          type: 'CONTACT_FOOD_JOINT',
          slug: place.slug,
          name: place.name,
          channel,
        };
      }
      return null;
    }
    case 'SAVE_FAVORITE': {
      const kind = raw.favoriteType;
      if (kind !== 'LOCATION' && kind !== 'FOOD_JOINT') return null;
      const place = resolve(
        raw.itemId,
        kind === 'LOCATION' ? lookups.locationById : lookups.foodById,
      );
      return place
        ? {
            type: 'SAVE_FAVORITE',
            favoriteType: kind,
            itemId: place.id,
            name: place.name,
          }
        : null;
    }
    default:
      return null;
  }
}

const resolve = (
  key: unknown,
  from: Map<string, GroundedPlace>,
): GroundedPlace | undefined =>
  typeof key === 'string' ? from.get(key) : undefined;

/** Drops every invented or malformed action, preserving order and de-duping. */
export function groundActions(
  values: unknown,
  sets: GroundingIndex,
): AssistantAction[] {
  if (!Array.isArray(values)) return [];
  const lookups = index(sets);
  const seen = new Set<string>();
  const out: AssistantAction[] = [];
  for (const value of values) {
    const action = parseAction(value, lookups);
    if (!action) continue;
    const key = JSON.stringify(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

/** Exported for tests that want to drive `parseAction` directly. */
export const buildLookups = index;
