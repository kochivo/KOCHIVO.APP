import type { KochivoDB, WorkoutSessionRow } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function hydrateSession(db: KochivoDB, id: string): Promise<void> {
  if (!db.userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.from('workout_sessions')
    .select('id,program_day_id,training_date,started_at,completed_at,session_rpe,player_note,client_updated_at')
    .eq('player_id', db.userId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data?.program_day_id) return;
  const remote = { ...data, program_day_id: data.program_day_id };
  await db.transaction('rw', db.workout_sessions, async () => {
    const local = await db.workout_sessions.get(id);
    const newer = !local || Date.parse(data.client_updated_at) > Date.parse(local.client_updated_at);
    const base = newer ? remote : local;
    const row: WorkoutSessionRow = { ...base,
      completed_at: base.completed_at ?? data.completed_at ?? local?.completed_at ?? null,
      session_rpe: base.session_rpe ?? data.session_rpe ?? local?.session_rpe,
      player_note: base.player_note ?? data.player_note ?? local?.player_note,
    };
    if (JSON.stringify(local) !== JSON.stringify(row)) await db.workout_sessions.put(row);
  });
}
