/**
 * Route templates. seed.ts expands each into two departures a day across a
 * rolling window, so dates are always relative to when the seed last ran.
 */
export interface SeedFlightRoute {
  /** Origin IATA code. */
  o: string;
  /** Destination IATA code. */
  d: string;
  /** Airline IATA code. */
  code: string;
  name: string;
  /** Block time in minutes. */
  dur: number;
  /** One-way fare in pesewas. */
  price: number;
}

export const seedFlightRoutes: SeedFlightRoute[] = [
  {
    o: 'ACC',
    d: 'LOS',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 75,
    price: 85000,
  },
  {
    o: 'LOS',
    d: 'ACC',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 75,
    price: 85000,
  },
  {
    o: 'ACC',
    d: 'ABJ',
    code: 'KP',
    name: 'ASKY Airlines',
    dur: 90,
    price: 120000,
  },
  {
    o: 'ACC',
    d: 'KMS',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 50,
    price: 45000,
  },
  {
    o: 'KMS',
    d: 'ACC',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 50,
    price: 45000,
  },
  {
    o: 'ACC',
    d: 'TML',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 65,
    price: 52000,
  },
  {
    o: 'TML',
    d: 'ACC',
    code: 'AW',
    name: 'Africa World Airlines',
    dur: 65,
    price: 52000,
  },
  {
    o: 'ACC',
    d: 'LHR',
    code: 'BA',
    name: 'British Airways',
    dur: 380,
    price: 950000,
  },
  {
    o: 'ACC',
    d: 'ADD',
    code: 'ET',
    name: 'Ethiopian Airlines',
    dur: 350,
    price: 620000,
  },
  {
    o: 'ACC',
    d: 'NBO',
    code: 'KQ',
    name: 'Kenya Airways',
    dur: 330,
    price: 780000,
  },
];
