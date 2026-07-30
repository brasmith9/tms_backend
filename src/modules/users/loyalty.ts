export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export function deriveTier(points: number): LoyaltyTier {
  if (points >= 5000) return 'PLATINUM';
  if (points >= 1000) return 'GOLD';
  if (points >= 500) return 'SILVER';
  return 'BRONZE';
}
