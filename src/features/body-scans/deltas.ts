import { actionTimezone } from '@/core/timezone/action-timezone';
import { daysBetween, localDate } from '@/lib/dates';

export const metrics = ['weight_kg', 'muscle_kg', 'fat_pct'] as const;
export type Metric = typeof metrics[number];
export type Measurements = Record<Metric, number | null>;
export type ScanPoint = Measurements & { scan_date: string };
export type Trend = 'good' | 'bad' | 'neutral';

function difference(first?: ScanPoint, last?: ScanPoint): Measurements {
  const delta = (key: Metric) => first?.[key] == null || last?.[key] == null
    ? null : Math.round((last[key] - first[key]) * 10) / 10;
  return { weight_kg: delta('weight_kg'), muscle_kg: delta('muscle_kg'), fat_pct: delta('fat_pct') };
}

export function latestDelta(scans: readonly ScanPoint[]): Measurements {
  return difference(scans.at(-2), scans.at(-1));
}

export function totalDelta(scans: readonly ScanPoint[]): Measurements {
  return scans.length < 2 ? difference() : difference(scans[0], scans.at(-1));
}

export function trend(metric: Metric, delta: number | null,
  goal?: { previous: number | null; latest: number | null; target: number | null }): Trend {
  if (delta == null || delta === 0) return 'neutral';
  if (metric === 'weight_kg') {
    if (goal?.target == null || goal.previous == null || goal.latest == null) return 'neutral';
    const change = Math.abs(goal.latest - goal.target) - Math.abs(goal.previous - goal.target);
    return change === 0 ? 'neutral' : change < 0 ? 'good' : 'bad';
  }
  return (metric === 'muscle_kg' ? delta > 0 : delta < 0) ? 'good' : 'bad';
}

export function alerts(scans: readonly ScanPoint[], now: Date, timezone = actionTimezone()) {
  const latest = scans.at(-1);
  const delta = latestDelta(scans);
  return {
    overdue: !latest || daysBetween(latest.scan_date, localDate(now, timezone)) > 30,
    regressing: delta.fat_pct != null && (delta.fat_pct >= 1 ||
      (delta.fat_pct > 0 && delta.muscle_kg != null && delta.muscle_kg < 0)),
  };
}
