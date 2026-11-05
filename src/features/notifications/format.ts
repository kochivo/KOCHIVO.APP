import { CalendarClock, CircleAlert } from 'lucide-react';
import type { Notification } from './types';

export function notificationTextKey(row: Notification) {
  if (!row.payload.player_id) {
    if (row.type === 'subscription_expiring') return 'subscription_expiring_player';
    if (row.type === 'subscription_expired') return 'subscription_expired_player';
  }
  return row.type;
}

export function notificationIcon(row: Notification) {
  if (row.type === 'subscription_expiring') return CalendarClock;
  if (row.type === 'subscription_expired') return CircleAlert;
  return null;
}

export function notificationHref(row: Notification): string {
  if ((row.type === 'subscription_expiring' || row.type === 'subscription_expired') && !row.payload.player_id) return '/player';
  if (row.type === 'captain_approved') return '/captain';
  if (row.type === 'plan_assigned' || row.type === 'workout_reminder') return '/player';
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
