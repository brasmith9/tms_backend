/**
 * Money is stored and calculated in integer pesewas throughout the app, and
 * exposed on the API as decimal cedis. These convert at that boundary only.
 */

/** GHS 150.50 -> 15050. Rounds because 150.55 * 100 is 15054.999999999998. */
export function cedisToPesewas(cedis: number): number {
  return Math.round(cedis * 100);
}

/** 15050 -> GHS 150.5. */
export function pesewasToCedis(pesewas: number): number {
  return Number((pesewas / 100).toFixed(2));
}
