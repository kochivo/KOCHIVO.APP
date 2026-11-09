import { z } from 'zod';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { PendingWorkout } from '../types';

const pointSchema = z.object({ id: z.uuid(), player_id: z.uuid(), source_key: z.uuid() });
const profileSchema = z.object({ id: z.uuid(), full_name: z.string() });
const sessionSchema = z.object({
  id: z.uuid(), player_id: z.uuid(), training_date: z.iso.date(),
  started_at: z.iso.datetime({ offset: true }), completed_at: z.iso.datetime({ offset: true }).nullable(),
});

export function combinePending(points: unknown, profiles: unknown, sessions: unknown): PendingWorkout[] {
  const names = new Map(z.array(profileSchema).parse(profiles).map(row => [row.id, row.full_name]));
  const workouts = new Map(z.array(sessionSchema).parse(sessions).map(row => [row.id, row]));
  return z.array(pointSchema).parse(points).map(point => {
    const session = workouts.get(point.source_key);
    const name = names.get(point.player_id);
    if (session && session.player_id !== point.player_id) {
      throw new Error('Pending workout details unavailable');
    }
    return { id: point.id, player_id: point.player_id, player_name: name ?? null,
      training_date: session?.training_date ?? null, started_at: session?.started_at ?? null,
      completed_at: session?.completed_at ?? null };
  });
}

export async function loadPending(): Promise<PendingWorkout[]> {
  const db = await loadSupabaseBrowser();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error('Authenticated captain required');
  const points: z.infer<typeof pointSchema>[] = [];
  // Page explicitly so the review count is not truncated by the Data API row limit.
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await db.from('points_log').select('id,player_id,source_key')
      .eq('captain_id', auth.user.id).eq('status', 'pending').eq('kind', 'workout')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 199);
    if (error) throw error;
    const page = z.array(pointSchema).parse(data);
    points.push(...page);
    if (page.length < 200) break;
  }
  if (!points.length) return [];
  const profiles: unknown[] = [];
  const sessions: unknown[] = [];
  // source_key is text, not a session foreign key, so it cannot be embedded with a join.
  for (let offset = 0; offset < points.length; offset += 100) {
    const chunk = points.slice(offset, offset + 100);
    const [people, workouts] = await Promise.all([
      db.from('profiles').select('id,full_name').in('id', [...new Set(chunk.map(row => row.player_id))]),
      db.from('workout_sessions').select('id,player_id,training_date,started_at,completed_at')
        .in('id', chunk.map(row => row.source_key)),
    ]);
    if (people.error) throw people.error;
    if (workouts.error) throw workouts.error;
    profiles.push(...z.array(profileSchema).parse(people.data));
    sessions.push(...z.array(sessionSchema).parse(workouts.data));
  }
  return combinePending(points, profiles, sessions);
}
