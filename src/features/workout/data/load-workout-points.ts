import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { loadMyPoints } from '@/features/ranks';

export async function loadWorkoutPoints(sessionId: string) {
  const { pointsRows, sessionIdSchema } = await import('./workout-points-schema');
  sessionIdSchema.parse(sessionId);
  const db = await loadSupabaseBrowser();
  const [points, logs] = await Promise.all([loadMyPoints(), db.from('points_log')
    .select('id,kind,points,status').or(`source_key.eq.${sessionId},source_key.like.${sessionId}:%`)]);
  if (logs.error) throw logs.error;
  return { points, rows: pointsRows.parse(logs.data) };
}
export type WorkoutPoints = Awaited<ReturnType<typeof loadWorkoutPoints>>;
