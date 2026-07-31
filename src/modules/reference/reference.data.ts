export interface RefItem {
  code: string;
  label: string;
}

const pair = (...codes: string[]): RefItem[] =>
  codes.map((code) => ({
    code,
    label: code
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

/** Static reference sets the UI would otherwise hardcode. Keys are the `:set` param. */
export const REFERENCE_SETS: Record<string, RefItem[]> = {
  'vehicle-types': pair('TAXI', 'CAR_HIRE', 'SHUTTLE', 'BUS'),
  'ride-statuses': pair(
    'REQUESTED',
    'DRIVER_ASSIGNED',
    'ARRIVING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ),
  cabins: pair('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'),
  'trip-types': pair('ONE_WAY', 'RETURN', 'MULTI_CITY'),
  'stay-categories': pair('HOTEL', 'VILLA', 'HOSTEL', 'APARTMENT'),
  'facility-types': pair(
    'HOSPITAL',
    'CLINIC',
    'PHARMACY',
    'POLICE',
    'FIRE',
    'EMBASSY',
  ),
  dietary: pair('VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'),
  amenities: pair(
    'WIFI',
    'POOL',
    'BREAKFAST',
    'PARKING',
    'GYM',
    'SPA',
    'AC',
    'RESTAURANT',
  ),
  cuisines: [
    'Ghanaian',
    'Nigerian',
    'Continental',
    'Chinese',
    'Japanese',
    'Indian',
    'Italian',
    'Lebanese',
    'Asian Fusion',
    'Fast Food',
  ].map((c) => ({ code: c.toUpperCase().replace(/\s+/g, '_'), label: c })),
  airports: [
    { code: 'ACC', label: 'Accra — Kotoka International' },
    { code: 'KMS', label: 'Kumasi Airport' },
    { code: 'TML', label: 'Tamale Airport' },
    { code: 'LOS', label: 'Lagos — Murtala Muhammed' },
    { code: 'ABJ', label: 'Abidjan — Félix-Houphouët-Boigny' },
    { code: 'ROB', label: 'Monrovia — Roberts International' },
    { code: 'DKR', label: 'Dakar — Blaise Diagne' },
    { code: 'LHR', label: 'London — Heathrow' },
  ],
  'loyalty-tiers': pair('BRONZE', 'SILVER', 'GOLD', 'PLATINUM'),
};

export const REFERENCE_SET_NAMES = Object.keys(REFERENCE_SETS);
