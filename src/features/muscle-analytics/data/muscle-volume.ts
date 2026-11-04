import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { daysBetween, localDate, saturdayWeek } from '@/lib/dates';
import { muscleMap, muscleSide, specificMuscle } from '../analytics/muscle-map';
import type { MuscleVolume, Region } from '../analytics/muscle-map';

export interface VolumeRow {
  completed_at: string;
  deleted_at: string | null;
  reps: number | null;
  exercises: { target: string | null; body_part: string } | null;
}
export interface VolumeWeek {
  start: string;
  regions: Record<Region, number>;
  anterior: number;
  posterior: number;
  total: number;
  muscles: MuscleVolume;
}

export function weeklyVolume(rows: readonly VolumeRow[], now: Date): VolumeWeek[] {
  const current = saturdayWeek(localDate(now))[0] ?? localDate(now);
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const at = new Date(`${current}T12:00:00Z`);
    at.setUTCDate(at.getUTCDate() - (3 - index) * 7);
    return { start: localDate(at, 'UTC'), regions: { chest: 0, back: 0, shoulders: 0, arms: 0, abs: 0, legs: 0 },
      anterior: 0, posterior: 0, total: 0, muscles: {} as MuscleVolume };
  });
  const first = weeks[0];
  if (!first) return weeks;
  for (const row of rows) {
    if (row.deleted_at || row.reps === null || row.reps < 1 || !row.exercises) continue;
    const at = new Date(row.completed_at);
    if (!Number.isFinite(at.getTime()) || at > now) continue;
    const week = weeks[Math.floor(daysBetween(first.start, localDate(at)) / 7)];
    const region = muscleMap(row.exercises.target, row.exercises.body_part);
    if (!week || !region) continue;
    week.regions[region] += 1;
    week.total += 1;
    const muscle = specificMuscle(row.exercises.target, region);
    week.muscles[muscle] = (week.muscles[muscle] ?? 0) + 1;
    const side = muscleSide(row.exercises.target, region);
    if (side) week[side] += 1;
  }
  return weeks;
}

export async function fetchMuscleVolume(playerId: string, now: Date): Promise<VolumeWeek[]> {
  const client = await loadSupabaseBrowser();
  const first = weeklyVolume([], now)[0];
  if (!first) return [];
  // A wide UTC lower bound includes Cairo's midnight on either side of DST.
  const lower = new Date(`${first.start}T00:00:00Z`);
  lower.setUTCDate(lower.getUTCDate() - 1);
  const rows: VolumeRow[] = [];
  let cursor: string | undefined;
  while (true) {
    let query = client.from('set_logs').select('id,completed_at,deleted_at,reps,exercises(target,body_part)')
      .eq('player_id', playerId).is('deleted_at', null).gte('reps', 1)
      .gte('completed_at', lower.toISOString()).lte('completed_at', now.toISOString())
      .order('id').limit(500);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    cursor = data.at(-1)?.id;
    if (data.length < 500) break;
  }
  return weeklyVolume(rows, now);
}
