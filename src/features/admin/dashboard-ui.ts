import type { AdminCaptainActivity } from './dashboard-types';
import type { CaptainRow, CaptainState } from './types';
import { captainState } from './format';
import { DEFAULT_TIMEZONE, daysBetween, localDate } from '@/lib/dates';

export type CaptainFilter = 'all' | CaptainState | 'expiringSoon' | 'overLimit' | 'quiet';
export const captainFilters = ['all', 'paid', 'free', 'expiringSoon', 'expired', 'unconfirmed', 'suspended'] as const;

export function parseCaptainFilter(value: unknown): CaptainFilter {
  return captainFilters.find(filter => filter === value) ?? (value === 'overLimit' || value === 'quiet' ? value : 'all');
}

export function filterCaptains(rows: CaptainRow[], filter: CaptainFilter, activity: AdminCaptainActivity[]) {
  return rows.filter(row => {
    if (filter === 'all') return true;
    if (filter === 'overLimit') return row.over_limit;
    if (filter === 'expiringSoon') return activity.find(item => item.id === row.id)?.expiringSoon === true;
    if (filter === 'quiet') return row.tier !== 'entry' && activity.find(item => item.id === row.id)?.quiet === true;
    return captainState(row) === filter;
  });
}
export function contextAction(row: CaptainRow, activity?: AdminCaptainActivity) {
  if (row.suspended) return 'restore';
  if (activity?.expiringSoon) return 'renew';
  if (row.over_limit) return 'upgrade';
  if (captainState(row) === 'free') return 'activate';
  return 'open';
}
export function whatsappLink(phone: string | null | undefined, text: string) {
  const digits = phone?.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}
function csvCell(value: string | number | null) {
  const text = String(value ?? '');
  // Neutralize spreadsheet formulas without changing normal numbers or embedded newlines.
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function captainsCsv(rows: CaptainRow[], activity: AdminCaptainActivity[], headers: string[]) {
  const activityById = new Map(activity.map(item => [item.id, item]));
  return [headers, ...rows.map(row => [row.full_name, row.email, row.tier, row.active_players, row.player_limit,
    row.tier_ends_at, captainState(row), activityById.get(row.id)?.lastActiveAt ?? null])]
    .map(cells => cells.map(csvCell).join(',')).join('\r\n');
}
export function relativeActivity(date: string | null | undefined, now: number) {
  if (!date || !Number.isFinite(Date.parse(date))) return { key: 'unknownActivity' } as const;
  const days = Math.max(0, daysBetween(localDate(new Date(date), DEFAULT_TIMEZONE), localDate(new Date(now), DEFAULT_TIMEZONE)));
  return { key: days === 0 ? 'today' : days === 1 ? 'yesterday' : 'daysAgo', days } as const;
}
