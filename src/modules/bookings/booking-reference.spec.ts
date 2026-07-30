import { generateReference } from './booking-reference';

describe('generateReference', () => {
  it('zero-pads the sequence to four digits with a year segment', () => {
    expect(generateReference(7, 2026)).toBe('TUR-2026-0007');
    expect(generateReference(1234, 2026)).toBe('TUR-2026-1234');
  });
});
