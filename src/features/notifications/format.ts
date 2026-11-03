import type { Notification } from './types';

export function notificationHref(row: Notification): string {
  if (row.type === 'plan_assigned') return '/player';
  if (row.type === 'nutrition_updated') return '/player/nutrition';
  return row.payload.player_id ? `/captain/players/${encodeURIComponent(row.payload.player_id)}` : '/captain/players';
}

export function relativeTime(createdAt: string, now: number): { key: 'now' | 'minutes' | 'hours' | 'days'; n: number } {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return { key: 'now', n: 0 };
  if (minutes < 60) return { key: 'minutes', n: minutes };
  if (minutes < 1440) return { key: 'hours', n: Math.floor(minutes / 60) };
  return { key: 'days', n: Math.floor(minutes / 1440) };
}
