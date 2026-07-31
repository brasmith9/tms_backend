/** All seed accounts share this password. */
export const SEED_PASSWORD = 'password123';

/** Shared Unsplash sizing so every seeded image loads at a sensible resolution. */
export const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

/**
 * Photo ids already proven to resolve in this repo. New seed rows reuse these
 * thematically rather than inventing ids, which would render as broken images.
 */
export const PHOTO = {
  coast: '1590523277543-a94d2e4eb00b',
  city: '1580060839134-75a5edca2e99',
  market: '1518495973542-4542c06a5843',
  savannah: '1516426122078-c23e76319801',
  beach: '1507525428034-b723cf961d3e',
  forest: '1441974231531-c6227db76b6e',
  castle: '1564507592333-c60657eea523',
  localFood: '1517248135467-4c7edcad34c4',
  fineDining: '1414235077428-338989a2e8c0',
  garden: '1552566626-52f8b828add9',
  seafood: '1555396273-367ea4eb4db5',
  hotel: '1566073771259-6a8506099945',
  luxuryHotel: '1571896349842-33c89424de2d',
  resort: '1582719478250-c89cae4dc85b',
} as const;

/** Open every day 11:00–22:00 UTC. */
export const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  opens: '11:00',
  closes: '22:00',
}));

/** Breakfast-through-dinner hours for the sit-down spots. */
export const LONG_DAY = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  opens: '07:00',
  closes: '23:00',
}));
