import type { Tier } from './types';

export const TIERS = [
  { tier: 'beginner', threshold: 0 },
  { tier: 'champion', threshold: 100 },
  { tier: 'elite', threshold: 300 },
  { tier: 'legend', threshold: 600 },
] as const;
export const CROWN_MIN_WORKOUTS = 4;
export const LEGEND_STAR_STEP = 300;

export const MEDAL_RANKS = [
  { rank: 'iron', threshold: 0 }, { rank: 'bronze', threshold: 100 },
  { rank: 'silver', threshold: 200 }, { rank: 'gold', threshold: 300 },
  { rank: 'platinum', threshold: 400 }, { rank: 'diamond', threshold: 600 },
  { rank: 'legend', threshold: 900 },
] as const;
export type MedalRank = typeof MEDAL_RANKS[number]['rank'];

export function medalRank(lifetime: number): MedalRank {
  return MEDAL_RANKS.findLast(entry => lifetime >= entry.threshold)?.rank ?? 'iron';
}

export function nextMedalRank(lifetime: number): { rank: MedalRank; needed: number } {
  const next = MEDAL_RANKS.find(entry => lifetime < entry.threshold);
  return next ? { rank: next.rank, needed: next.threshold - lifetime }
    : { rank: 'legend', needed: 1200 + legendStars(lifetime) * LEGEND_STAR_STEP - lifetime };
}

export function legendStars(lifetime: number): number {
  return lifetime < 1200 ? 0 : Math.floor((lifetime - 900) / LEGEND_STAR_STEP);
}

export function tierFor(lifetime: number): Tier {
  return TIERS.findLast(entry => lifetime >= entry.threshold)?.tier ?? 'beginner';
}

export function nextTier(lifetime: number): { tier: Tier; needed: number } {
  const next = TIERS.find(entry => lifetime < entry.threshold);
  return next ? { tier: next.tier, needed: next.threshold - lifetime }
    : { tier: 'legend', needed: 600 + (Math.floor((lifetime - 600) / LEGEND_STAR_STEP) + 1) * LEGEND_STAR_STEP - lifetime };
}
