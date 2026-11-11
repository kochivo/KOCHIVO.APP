import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { normalizeName } from './match';
import type { KoRole } from '@/features/ko-core';

export type KoActor = { id: string; role: KoRole; db: Awaited<ReturnType<typeof supabaseServer>> };

export async function getKoActor(): Promise<KoActor | null> {
  const db = await supabaseServer();
  const { data: auth, error } = await db.auth.getUser();
  if (error || !auth.user || auth.user.is_anonymous) return null;
  const profile = await db.rpc('my_approval_route_profile');
  const row = profile.data?.[0];
  if (profile.error || !row?.role_confirmed || row.suspended_at || row.is_admin) return null;
  if (row.role !== 'player' && (row.role !== 'captain' || row.captain_status !== 'approved')) return null;
  return { id: auth.user.id, role: row.role, db };
}

export async function resolvePlayer(actor: KoActor, name: string | undefined): Promise<{ id: string; name: string } | null> {
  if (actor.role === 'player') return name === undefined ? { id: actor.id, name: '' } : null;
  if (!name) return null;
  const { data, error } = await actor.db.rpc('captain_roster');
  if (error) throw error;
  const key = normalizeName(name);
  if (!key) return null;
  const exact = data.filter(row => normalizeName(row.full_name) === key);
  const matches = exact.length ? exact : data.filter(row => normalizeName(row.full_name).startsWith(key + ' '));
  const match = matches.length === 1 ? matches[0] : undefined;
  return match ? { id: match.player_id, name: match.full_name } : null;
}

export async function currentExercise(actor: KoActor, player: string, name: string, day?: string) {
  const { data, error } = await actor.db.from('programs')
    .select('program_days(title,program_exercises(id,sets,reps_min,reps_max,exercises(name_ar,name_en,instructions_ar,instructions_en)))')
    .eq('player_id', player).eq('status', 'active').eq('is_template', false)
    .maybeSingle();
  if (error) throw error;
  const key = day ? normalizeName(day) : null;
  const rows = (data?.program_days ?? []).filter(row => !key || normalizeName(row.title) === key)
    .flatMap(row => row.program_exercises.flatMap(exercise => exercise.exercises ? [
      { ...exercise, ...exercise.exercises, day: row.title },
    ] : []));
  return rows;
}
