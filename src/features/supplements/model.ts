import { daysBetween, localDate } from '@/lib/dates';

export const timings = ['morning', 'pre_workout', 'post_workout', 'with_meal', 'before_bed', 'any'] as const;
export type Timing = typeof timings[number];

export function groupByTiming<T extends { timing: string; position: number }>(rows: T[]) {
  return timings.map(timing => ({ timing, items: rows.filter(row => row.timing === timing).sort((a, b) => a.position - b.position) }))
    .filter(group => group.items.length > 0);
}

export function supplementAdherence(
  logs: { supplement_id: string; log_date: string; taken_at: string | null; deleted_at?: string | null }[],
  supplements: { id: string }[], days: number, now: number,
): number {
  if (days <= 0 || supplements.length === 0) return 0;
  const ids = new Set(supplements.map(row => row.id));
  const today = localDate(new Date(now));
  const ticks = new Set(logs.filter(row => {
    const age = daysBetween(row.log_date, today);
    return ids.has(row.supplement_id) && row.taken_at && !row.deleted_at && age >= 0 && age < days;
  }).map(row => `${row.supplement_id}:${row.log_date}`));
  return ticks.size / (ids.size * days);
}
