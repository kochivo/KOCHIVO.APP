import { DEFAULT_TIMEZONE, daysBetween, localDate } from '@/lib/dates';
import type { InboxItem } from './types';

export type CheckinHistory = Pick<Extract<InboxItem, { kind: 'checkin' }>,
  'id' | 'player_id' | 'week_start' | 'body_weight_kg' | 'waist_cm'>;
export type DailyCheck = { player_id: string; log_date: string; sleep_hours: number | null;
  soreness: number | null; deleted_at: string | null };
export type TriageFlag = { key: 'weight_flat' | 'weight_jump' | 'low_sleep' | 'high_soreness' | 'no_logs' | 'note_present';
  values: Record<string, number> };
export type TriageResult = { group: 'attention' | 'routine'; flags: TriageFlag[] };
export type TriageInputs = { history: CheckinHistory[]; dailyChecks: DailyCheck[] };
export const emptyInputs: TriageInputs = { history: [], dailyChecks: [] };
export const inboxKey = (item: { kind: string; id: string }) => `${item.kind}:${item.id}`;

export function dailyAverages(playerId: string, checks: DailyCheck[], now: Date, timezone = DEFAULT_TIMEZONE) {
  const today = localDate(now, timezone);
  const rows = checks.filter(row => row.player_id === playerId && !row.deleted_at &&
    daysBetween(row.log_date, today) >= 0 && daysBetween(row.log_date, today) < 7);
  const average = (key: 'sleep_hours' | 'soreness') => {
    const values = rows.flatMap(row => row[key] === null ? [] : [row[key]]);
    return values.length >= 3 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  return { sleep: average('sleep_hours'), soreness: average('soreness'), count: rows.length };
}

export function previousCheckins(item: CheckinHistory, history: CheckinHistory[]) {
  return history.filter(row => row.player_id === item.player_id && row.id !== item.id && row.week_start < item.week_start)
    .sort((a, b) => b.week_start.localeCompare(a.week_start) || a.id.localeCompare(b.id));
}

export function triage(item: InboxItem, history: CheckinHistory[], dailyChecks: DailyCheck[], now: Date, timezone = item.timezone ?? DEFAULT_TIMEZONE): TriageResult {
  const flags: TriageFlag[] = [];
  const add = (key: TriageFlag['key'], values: TriageFlag['values'] = {}) => flags.push({ key, values });
  if (item.kind === 'checkin') {
    const past = previousCheckins(item, history);
    const weights = [item, ...past.slice(0, 2)].map(row => row.body_weight_kg);
    // Quantize database decimal weights before threshold comparisons to avoid binary rounding at 0.3 kg.
    const change = (a: number, b: number) => Math.abs(Math.round(a * 1000) - Math.round(b * 1000)) / 1000;
    const first = weights[0], last = weights[2];
    if (weights.length === 3 && weights.every(value => value !== null) && first != null && last != null &&
      change(first, last) < 0.3) add('weight_flat', { weeks: 2 });
    if (item.body_weight_kg !== null && past[0]?.body_weight_kg != null) {
      const delta = change(item.body_weight_kg, past[0].body_weight_kg);
      if (delta >= 2) add('weight_jump', { kg: delta });
    }
    const averages = dailyAverages(item.player_id, dailyChecks, now, timezone);
    if (averages.sleep !== null && averages.sleep < 6) add('low_sleep', { hours: averages.sleep });
    if (averages.soreness !== null && averages.soreness >= 4) add('high_soreness', { score: averages.soreness });
    if (!averages.count) add('no_logs', { days: 7 });
  }
  if ((item.kind === 'checkin' ? item.notes : item.note)?.trim()) add('note_present');
  return { group: flags.some(flag => flag.key !== 'note_present') ? 'attention' : 'routine', flags };
}

export function orderTriage<T extends { kind: string; id: string; created_at: string }>(items: T[], result: (item: T) => TriageResult): T[] {
  return [...items].sort((a, b) => {
    const first = result(a), second = result(b);
    return Number(second.group === 'attention') - Number(first.group === 'attention') ||
      second.flags.length - first.flags.length || a.created_at.localeCompare(b.created_at) || inboxKey(a).localeCompare(inboxKey(b));
  });
}

export function nextOpenItem(items: InboxItem[], current: InboxItem, result: (item: InboxItem) => TriageResult) {
  const group = result(current).group;
  const rows = orderTriage(items.filter(row => !row.reviewed_at && result(row).group === group), result);
  const index = rows.findIndex(row => inboxKey(row) === inboxKey(current));
  return rows.slice(index + 1).find(row => inboxKey(row) !== inboxKey(current)) ??
    rows.slice(0, Math.max(index, 0)).find(row => inboxKey(row) !== inboxKey(current)) ?? null;
}
