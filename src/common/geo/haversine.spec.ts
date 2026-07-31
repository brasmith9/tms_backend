import { distanceKm } from './haversine';

describe('distanceKm', () => {
  it('is zero for identical points', () => {
    expect(distanceKm(5.106, -1.246, 5.106, -1.246)).toBe(0);
  });

  it('approximates the Accra→Cape Coast distance (~120km)', () => {
    // Accra (5.6037, -0.187) to Cape Coast (5.106, -1.246)
    const d = distanceKm(5.6037, -0.187, 5.106, -1.246);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(135);
  });
});
