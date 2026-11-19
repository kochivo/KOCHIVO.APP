import { DEFAULT_TIMEZONE, daysBetween, localDate } from '@/lib/dates';

export const timings = ['morning', 'pre_workout', 'post_workout', 'with_meal', 'before_bed', 'any'] as const;
export type Timing = typeof timings[number];

export function groupByTiming<T extends { timing: string; position: number }>(rows: T[]) {
  return timings.map(timing => ({ timing, items: rows.filter(row => row.timing === timing).sort((a, b) => a.position - b.position) }))
    .filter(group => group.items.length > 0);
}

export function supplementAdherenceCounts(
  logs: { supplement_id: string; log_date: string; taken_at: string | null; deleted_at?: string | null }[],
  supplements: { id: string; created_at: string }[], days: number, now: number, timezone = DEFAULT_TIMEZONE,
) {
  const today = localDate(new Date(now), timezone);
  const eligibleDays = new Map(supplements.map(row => {
    const assigned = localDate(new Date(row.created_at), timezone);
    return [row.id, Math.max(0, Math.min(days, daysBetween(assigned, today) + 1))];
  }));
  const ticks = new Set(logs.filter(row => {
    const age = daysBetween(row.log_date, today);
    return row.taken_at && !row.deleted_at && age >= 0 && age < (eligibleDays.get(row.supplement_id) ?? 0);
  }).map(row => `${row.supplement_id}:${row.log_date}`));
  return { taken: ticks.size, eligible: [...eligibleDays.values()].reduce((total, count) => total + count, 0) };
}

export function supplementAdherence(...args: Parameters<typeof supplementAdherenceCounts>): number {
  const { taken, eligible } = supplementAdherenceCounts(...args);
  return eligible > 0 ? taken / eligible : 0;
}
