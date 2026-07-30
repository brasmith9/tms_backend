import { deriveTier } from './loyalty';

describe('deriveTier', () => {
  it.each([
    [0, 'BRONZE'],
    [499, 'BRONZE'],
    [500, 'SILVER'],
    [999, 'SILVER'],
    [1000, 'GOLD'],
    [4999, 'GOLD'],
    [5000, 'PLATINUM'],
  ])('maps %i points to %s', (points, tier) => {
    expect(deriveTier(points)).toBe(tier);
  });
});
