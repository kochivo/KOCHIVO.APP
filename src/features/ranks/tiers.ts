import type { Tier } from './types';

export const TIERS = [
  { tier: 'beginner', threshold: 0 },
  { tier: 'champion', threshold: 100 },
  { tier: 'elite', threshold: 300 },
  { tier: 'legend', threshold: 600 },
] as const;
export const CROWN_MIN_WORKOUTS = 4;
/** @deprecated Use CROWN_MIN_WORKOUTS. Kept for the pending crown UI update. */
export const CROWN_MIN_MONTHLY = CROWN_MIN_WORKOUTS;

export function tierFor(lifetime: number): Tier {
  return TIERS.findLast(entry => lifetime >= entry.threshold)?.tier ?? 'beginner';
}

export function nextTier(lifetime: number): { tier: Tier; needed: number } {
  const next = TIERS.find(entry => lifetime < entry.threshold);
  return next ? { tier: next.tier, needed: next.threshold - lifetime } : { tier: 'legend', needed: 0 };
}
