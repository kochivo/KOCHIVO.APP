import { localDate } from '@/lib/dates';
import type { TrendPoint } from '../trends';

export function rangePoints(points: readonly TrendPoint[], today: string, months: number) {
  if (!today) return [];
  const start = new Date(`${today}T12:00:00Z`);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - months);
  const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, last));
  const from = localDate(start, 'UTC');
  return points.filter(point => point.date >= from && point.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function weightChange(points: readonly TrendPoint[]) {
  if (points.length < 2) return null;
  const delta = (points.at(-1)?.value ?? 0) - (points[0]?.value ?? 0);
  if (Math.abs(delta) < 0.05) return null;
  return { direction: delta < 0 ? 'down' as const : 'up' as const, amount: Number(Math.abs(delta).toFixed(1)) };
}
