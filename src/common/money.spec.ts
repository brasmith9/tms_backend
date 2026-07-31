import { cedisToPesewas, pesewasToCedis } from './money';

describe('money', () => {
  describe('cedisToPesewas', () => {
    it('converts a whole cedi amount', () => {
      expect(cedisToPesewas(120)).toBe(12000);
    });

    it('converts an amount with coins', () => {
      expect(cedisToPesewas(150.5)).toBe(15050);
    });

    // 150.55 * 100 is 15054.999999999998 in binary floating point.
    it('rounds away float artifacts', () => {
      expect(cedisToPesewas(150.55)).toBe(15055);
    });

    it('converts zero', () => {
      expect(cedisToPesewas(0)).toBe(0);
    });
  });

  describe('pesewasToCedis', () => {
    it('converts a whole cedi amount', () => {
      expect(pesewasToCedis(12000)).toBe(120);
    });

    it('converts an amount with coins', () => {
      expect(pesewasToCedis(15050)).toBe(150.5);
    });

    it('converts a single pesewa', () => {
      expect(pesewasToCedis(1)).toBe(0.01);
    });

    it('converts zero', () => {
      expect(pesewasToCedis(0)).toBe(0);
    });
  });

  it('round-trips through both directions', () => {
    for (const cedis of [0, 0.01, 1.99, 120, 150.55, 28000.75]) {
      expect(pesewasToCedis(cedisToPesewas(cedis))).toBe(cedis);
    }
  });
});
