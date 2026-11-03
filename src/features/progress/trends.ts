import { daysBetween } from '@/lib/dates';

export interface TrendPoint { date: string; value: number }
export interface StrengthSet {
  exercise_id: string;
  training_date: string;
  weight_kg: number | null;
  reps: number | null;
}

export function topSets(sets: readonly StrengthSet[], exerciseId: string) {
  const days = new Map<string, TrendPoint & { reps: number }>();
  for (const set of sets) {
    if (set.exercise_id !== exerciseId || set.weight_kg === null) continue;
    const best = days.get(set.training_date);
    const reps = set.reps ?? 0;
    if (!best || set.weight_kg > best.value || (set.weight_kg === best.value && reps > best.reps)) {
      days.set(set.training_date, { date: set.training_date, value: set.weight_kg, reps });
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function trendDelta(points: readonly TrendPoint[], weeks = 4): number | null {
  const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = ordered.at(-1);
  if (!latest) return null;
  const baseline = ordered.filter((point) => daysBetween(point.date, latest.date) >= weeks * 7).at(-1);
  return baseline ? latest.value - baseline.value : null;
}

export function mainLifts(sets: readonly Pick<StrengthSet, 'exercise_id'>[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const set of sets) counts.set(set.exercise_id, (counts.get(set.exercise_id) ?? 0) + 1);
  return [...counts].sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b))
    .slice(0, Math.max(0, limit)).map(([id]) => id);
}
