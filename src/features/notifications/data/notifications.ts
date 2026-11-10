import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { Notification, NotificationType } from '../types';
import { ranksEnabled } from '@/lib/ranks-enabled';

// While ranks are hidden, their notifications stay in the table but never reach the bell.
const RANK_TYPES = '(rank_up,crown_taken,crown_lost,crown_close,crown_defend)';

export async function unreadCount(): Promise<number> {
  const client = await loadSupabaseBrowser();
  const base = client.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
  const { count, error } = await (ranksEnabled() ? base : base.not('type', 'in', RANK_TYPES));
  if (error) throw error;
  return count ?? 0;
}

export async function latestNotifications(): Promise<Notification[]> {
  const client = await loadSupabaseBrowser();
  const base = client.from('notifications').select('*');
  const { data, error } = await (ranksEnabled() ? base : base.not('type', 'in', RANK_TYPES))
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
  if (error) throw error;
  const sessionIds = (data ?? []).flatMap(row => {
    const payload = row.payload;
    return row.type === 'workout_feedback' && payload && typeof payload === 'object' && !Array.isArray(payload)
      && typeof payload.session_id === 'string' ? [payload.session_id] : [];
  });
  const sessions = sessionIds.length ? await client.from('workout_sessions').select('id,player_id').in('id', sessionIds) : null;
  if (sessions?.error) throw sessions.error;
  const players = new Map((sessions?.data ?? []).map(row => [row.id, row.player_id]));
  return (data ?? []).map(row => {
    const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload : {};
    return { ...row, type: row.type as NotificationType, payload: {
      name: row.type === 'workout_reminder' && typeof payload.day_title === 'string'
        ? payload.day_title : typeof payload.name === 'string' ? payload.name : '',
      player_id: row.type === 'workout_feedback' && typeof payload.session_id === 'string' ? players.get(payload.session_id)
        : typeof payload.player_id === 'string' ? payload.player_id : undefined,
      plan_id: typeof payload.plan_id === 'string' ? payload.plan_id : undefined,
      captain_name: typeof payload.captain_name === 'string' ? payload.captain_name : undefined,
      tier: payload.tier === 'champion' || payload.tier === 'elite' || payload.tier === 'legend' ? payload.tier : undefined,
      needs_workouts: typeof payload.needs_workouts === 'number' ? payload.needs_workouts : undefined,
      gap: typeof payload.gap === 'number' ? payload.gap : undefined,
    } };
  });
}

export async function markRead(id?: string): Promise<void> {
  const client = await loadSupabaseBrowser();
  const query = client.from('notifications').update({ is_read: true });
  const { error } = await (id ? query.eq('id', id) : query.eq('is_read', false));
  if (error) throw error;
}
