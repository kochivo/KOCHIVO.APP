import type { TodayDecision } from '@/core/offline/use-today-decision';

export type Decision = TodayDecision;
export interface ReadinessInput {
  sleepHours?: number | null;
  waterMl?: number | null;
  waterGoalMl?: number;
  soreness?: number | null;
}

export function readinessScore(input: ReadinessInput) {
  const { sleepHours: s, waterMl: w, soreness: r } = input;
  const parts = {
    sleep: s == null ? null : Math.max(0, 1 - Math.abs(8 - Math.min(s, 9)) / 4),
    water: w == null ? null : Math.max(0, Math.min(w / (input.waterGoalMl || 3000), 1)),
    soreness: r == null ? null : (5 - r) / 4,
  };
  const weights = { sleep: .4, water: .25, soreness: .35 };
  let total = 0;
  let weight = 0;
  for (const key of ['sleep', 'water', 'soreness'] as const) {
    const part = parts[key];
    if (part !== null) { total += part * weights[key]; weight += weights[key]; }
  }
  if (!weight) return null;
  return { score: Math.max(0, Math.min(100, Math.round(100 * total / weight))), parts,
    flags: { lowSleep: s != null && s < 5, highSoreness: r != null && r >= 4 } };
}

export function suggestDecision(score: number | null): Decision {
  return score === null || score >= 80 ? 'keep' : score >= 50 ? 'reduce' : 'rest';
}

export function reducedSets(sets: number): number { return Math.max(1, Math.round(sets * .8)); }
