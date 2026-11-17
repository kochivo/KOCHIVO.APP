import { Award, CalendarClock, CircleAlert, Crown, HeartPulse } from 'lucide-react';
import type { Notification } from './types';

export function notificationTextKey(row: Notification) {
  if (row.type === 'coach_replied' && row.payload.kind === 'assessment') return 'coach_replied_assessment';
  if (row.type === 'coach_replied' && row.payload.kind === 'form_check') return 'coach_replied_form_check';
  if (row.type === 'swap_decided' && row.payload.status === 'declined') return 'swap_decided_declined';
  if (row.type === 'crown_close' && row.payload.needs_workouts === 0 && (row.payload.gap ?? 0)>0) return 'crown_close_points';
  if (row.type === 'rank_up') {
    if (medalKey(row.payload.medal)) return 'rank_up_medal';
    const tier = row.payload.tier;
    return tier === 'champion' || tier === 'elite' || tier === 'legend' ? `rank_up_${tier}` as const : 'rank_up';
  }
  if (!row.payload.player_id) {
    if (row.type === 'subscription_expiring') return 'subscription_expiring_player';
    if (row.type === 'subscription_expired') return 'subscription_expired_player';
  }
  return row.type;
}

export function notificationIcon(row: Notification) {
  if (row.type === 'player_pain' || row.type === 'pain_answered') return HeartPulse;
  if (row.type === 'rank_up' || row.type === 'player_rank_up') return Award;
  if (row.type === 'crown_taken' || row.type === 'crown_lost' || row.type === 'crown_close' || row.type === 'crown_defend') return Crown;
  if (row.type === 'subscription_expiring') return CalendarClock;
  if (row.type === 'subscription_expired') return CircleAlert;
  return null;
}

export function medalKey(value?: string) {
  return value === 'iron' || value === 'bronze' || value === 'silver' || value === 'gold'
    || value === 'platinum' || value === 'diamond' || value === 'legend' ? value : undefined;
}

export function notificationHref(row: Notification): string {
  const important = importantNotificationHref(row);
  if (important) return important;
  if (row.type === 'player_pain') return row.payload.player_id ? `/captain/players/${encodeURIComponent(row.payload.player_id)}#pain-reports` : '/captain/players';
  if (row.type === 'pain_answered') return '/player/captain';
  if (row.type === 'ramadan_soon') return '/captain/settings#ramadan';
  if (row.type === 'chat_message') return row.user_id === row.payload.player_id ? '/player/captain'
    : row.payload.player_id ? `/captain/players/${encodeURIComponent(row.payload.player_id)}/chat` : '/captain/players';
  if (row.type === 'form_requested') return row.payload.request_id
    ? `/player/forms/${encodeURIComponent(row.payload.request_id)}` : '/player';
  if (row.type === 'rank_up' || row.type === 'crown_taken' || row.type === 'crown_lost'
    || row.type === 'crown_close' || row.type === 'crown_defend') return '/player/rank';
  if ((row.type === 'subscription_expiring' || row.type === 'subscription_expired') && !row.payload.player_id) return '/player';
  if (row.type === 'captain_approved') return '/captain';
  if (row.type === 'plan_assigned' || row.type === 'workout_reminder') return '/player';
  if (row.type === 'nutrition_updated') return '/player/nutrition';
  return row.payload.player_id ? `/captain/players/${encodeURIComponent(row.payload.player_id)}` : '/captain/players';
}

export function importantNotificationHref(row: Notification): string | undefined {
  if (row.type === 'freeze_requested') return '/captain/billing';
  if (row.type === 'freeze_approved' || row.type === 'freeze_declined') return '/player';
  const player = row.payload.player_id ? `/captain/players/${encodeURIComponent(row.payload.player_id)}` : undefined;
  if (row.type === 'coach_replied') return row.payload.kind === 'assessment'
    ? row.payload.request_id ? `/player/forms/${encodeURIComponent(row.payload.request_id)}` : '/player/assessments'
    : '/player/captain';
  if (row.type === 'swap_decided') return '/player';
  if (row.type === 'receipt_submitted') return '/captain/billing';
  if (row.type === 'swap_requested') return player ?? '/captain/players';
  if (row.type === 'form_check_submitted') return '/captain/tasks';
  if (row.type === 'checkin_submitted') return player ? `${player}/checkins` : '/captain/players';
  if (row.type === 'form_answered') return player ? `${player}/assessments${row.payload.request_id
    ? `?requestId=${encodeURIComponent(row.payload.request_id)}#assessment-details` : ''}` : '/captain/players';
}

export function relativeTime(createdAt: string, now: number): { key: 'now' | 'minutes' | 'hours' | 'days'; n: number } {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
  if (minutes < 1) return { key: 'now', n: 0 };
  if (minutes < 60) return { key: 'minutes', n: minutes };
  if (minutes < 1440) return { key: 'hours', n: Math.floor(minutes / 60) };
  return { key: 'days', n: Math.floor(minutes / 1440) };
}
