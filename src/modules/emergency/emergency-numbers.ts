export interface EmergencyNumber {
  label: string;
  number: string;
}

/** National emergency numbers, keyed by ISO country code. */
const NUMBERS: Record<string, EmergencyNumber[]> = {
  GH: [
    { label: 'National Emergency', number: '112' },
    { label: 'Police', number: '191' },
    { label: 'Ambulance', number: '193' },
    { label: 'Fire Service', number: '192' },
  ],
};

export function emergencyNumbersFor(country: string): EmergencyNumber[] {
  return NUMBERS[country.toUpperCase()] ?? NUMBERS.GH;
}
