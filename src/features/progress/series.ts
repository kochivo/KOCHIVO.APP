import type { TrendPoint } from './trends';
import { localDate } from '@/lib/dates';

export type ChartPeriod = 'month' | 'quarter' | 'all';

export function filterPeriod(points: readonly TrendPoint[], period: ChartPeriod, today: string) {
  if (period === 'all') return points;
  const date = new Date(`${today}T12:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - (period === 'month' ? 1 : 3));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  const cutoff = localDate(date, 'UTC');
  return points.filter(point => point.date >= cutoff && point.date <= today);
}

export function dateTicks(dates: readonly string[]) {
  if (dates.length <= 4) return dates;
  const positions = Array.from({ length: 4 }, (_, index) => Math.round(index * (dates.length - 1) / 3));
  return dates.filter((_, index) => positions.includes(index));
}

export function yTicks(values: readonly number[], target?: number | null) {
  const min = Math.min(...values, target ?? Infinity);
  const max = Math.max(...values, target ?? -Infinity);
  if (min === max) return [max + 1, max, min - 1] as const;
  const midpoint = (min + max) / 2;
  const step = 10 ** Math.floor(Math.log10((max - min) / 2));
  const middle = Math.round(midpoint / step) * step;
  const span = Math.ceil(Math.max(max - middle, middle - min) / step) * step;
  return [middle + span, middle, middle - span] as const;
}

export function scaleSeries(points: readonly TrendPoint[], weeks: readonly string[], rtl: boolean) {
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  return [...points].sort((a, b) => a.date.localeCompare(b.date)).map(point => {
    const index = weeks.indexOf(point.date);
    const offset = weeks.length < 2 ? 140 : index * 280 / (weeks.length - 1);
    return { ...point, x: rtl ? 315 - offset : 35 + offset,
      y: max === min ? 70 : 115 - (point.value - min) / (max - min) * 90 };
  });
}
