import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { Notification, NotificationType } from '../types';

export async function unreadCount(): Promise<number> {
  const client = await loadSupabaseBrowser();
  const { count, error } = await client.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function latestNotifications(): Promise<Notification[]> {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.from('notifications').select('*').order('created_at', { ascending: false })
    .order('id', { ascending: false }).limit(20);
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
    } };
  });
}

export async function markRead(id?: string): Promise<void> {
  const client = await loadSupabaseBrowser();
  const query = client.from('notifications').update({ is_read: true });
  const { error } = await (id ? query.eq('id', id) : query.eq('is_read', false));
  if (error) throw error;
}
