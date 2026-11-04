import type { TrendPoint } from '@/features/progress';

export const profileTabs = ['intake', 'progress', 'plan', 'checkins', 'analysis'] as const;
export type ProfileTab = (typeof profileTabs)[number];

export function parseTab(value: unknown): ProfileTab {
  return profileTabs.find((tab) => tab === value) ?? 'intake';
}

/** Index matches JavaScript's getDay(), which is how intake stores training days. */
export const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function trainingDayKeys(days: readonly number[]) {
  // Egyptian weeks start on Saturday.
  return [...days].sort((a, b) => (a + 1) % 7 - (b + 1) % 7).flatMap((day) => weekdayKeys[day] ?? []);
}

export function ageIn(birthYear: number, today: string): number {
  return Number(today.slice(0, 4)) - birthYear;
}

export function weightPoints(checkIns: readonly { weekStart: string; weightKg: number | null }[]): TrendPoint[] {
  return checkIns.flatMap((row) => row.weightKg === null ? [] : [{ date: row.weekStart, value: row.weightKg }])
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightSummary {
  latest: number;
  change: number;
  toTarget: number | null;
}

export function weightSummary(points: readonly TrendPoint[], targetKg: number | null): WeightSummary | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;
  const round = (value: number) => Math.round(value * 10) / 10;
  return { latest: last.value, change: round(last.value - first.value), toTarget: targetKg === null ? null : round(targetKg - last.value) };
}

/** Labels for the chips a player picked, without the "none" placeholder. */
export function pickedLabels<Label extends string>(keys: readonly string[], options: readonly { key: string; label: Label }[]): Label[] {
  return keys.flatMap((key) => key === 'none' ? [] : options.filter((option) => option.key === key).map((option) => option.label));
}
