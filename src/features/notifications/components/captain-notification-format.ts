import { Banknote, Bell, CalendarClock, ClipboardList, Play, Trophy, UserPlus } from 'lucide-react';
import type { Notification, NotificationType } from '../types';

// Pain and inactivity alerts carry no event detail in the list and both link to the
// same aggregate view (the player file / its pain reports), so repeated rows for one
// player read as the same alert several times. Keep the latest per player and drop
// the rest. Every other type stays one row per event: its payload identifies the
// event (a form request, a check-in, a receipt) and hiding it would hide real work.
const DEDUPED_TYPES: ReadonlySet<NotificationType> = new Set(['player_pain', 'player_inactive']);

export function deduplicateNotifications(rows: Notification[]): Notification[] {
  // Rows arrive newest first, so the first row kept per key is the latest one.
  const seen = new Set<string>();
  return rows.filter(row => {
    if (!DEDUPED_TYPES.has(row.type)) return true;
    const key = `${row.type}:${row.payload.player_id ?? row.payload.name ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function captainNotification(kind: NotificationType) {
  if (kind === 'ramadan_soon') return { Icon: CalendarClock, href: '/captain/settings#ramadan' };
  if (kind === 'workout_feedback') return { Icon: Play, href: '/captain/tasks' };
  if (kind === 'form_requested' || kind === 'form_answered' || kind === 'checkin_submitted') return { Icon: ClipboardList, href: '/captain/tasks' };
  if (kind === 'form_check_submitted') return { Icon: Play, href: '/captain/tasks' };
  if (kind === 'renewal_requested' || kind === 'subscription_expiring'
    || kind === 'subscription_expired' || kind === 'sessions_used_up' || kind === 'receipt_submitted') {
    return { Icon: Banknote, href: '/captain/billing' };
  }
  if (kind === 'join_requested' || kind === 'player_joined') return { Icon: UserPlus, href: '/captain/join' };
  if (kind === 'rank_up' || kind === 'player_rank_up' || kind.startsWith('crown_')) return { Icon: Trophy, href: '/captain/leaderboard' };
  return { Icon: Bell, href: kind === 'chat_message' ? '/captain/inbox' : '/captain/players' };
}
