export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

/** Small first-party airport reference (the seeded routes fly between these). */
export const AIRPORTS: Airport[] = [
  {
    code: 'ACC',
    name: 'Kotoka International',
    city: 'Accra',
    country: 'Ghana',
  },
  { code: 'KMS', name: 'Kumasi Airport', city: 'Kumasi', country: 'Ghana' },
  { code: 'TML', name: 'Tamale Airport', city: 'Tamale', country: 'Ghana' },
  { code: 'LOS', name: 'Murtala Muhammed', city: 'Lagos', country: 'Nigeria' },
  {
    code: 'ABJ',
    name: 'Félix-Houphouët-Boigny',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
  },
  {
    code: 'ROB',
    name: 'Roberts International',
    city: 'Monrovia',
    country: 'Liberia',
  },
  { code: 'DKR', name: 'Blaise Diagne', city: 'Dakar', country: 'Senegal' },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom' },
];

export function searchAirports(q?: string): Airport[] {
  if (!q) return AIRPORTS;
  const needle = q.toLowerCase();
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(needle) ||
      a.name.toLowerCase().includes(needle) ||
      a.city.toLowerCase().includes(needle),
  );
}
