import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { Locale } from '@/core/i18n/locale';

import { localDb } from '@/core/offline';
import type { ProgramSnapshot } from '@/features/player-home';
import type { StrengthSet } from '../trends';

export interface StrengthHistory { sets: StrengthSet[]; names: Record<string, string> }
export type StrengthLog = StrengthSet & { id: string; deleted_at: string | null; drop_index?: number;
  name_ar?: string | null; name_en?: string | null };

export function mergeStrength(local: StrengthLog[], remote: StrengthLog[]): StrengthSet[] {
  const rows = new Map(remote.map(row => [row.id, row]));
  for (const row of local) rows.set(row.id, row);
  return [...rows.values()].filter(row => !row.deleted_at && (row.drop_index ?? 0) === 0 && row.training_date)
    .map(({ exercise_id, training_date, weight_kg, reps }) => ({ exercise_id, training_date, weight_kg, reps }));
}

export async function readRemoteStrength(): Promise<StrengthLog[]> {
  const id = localDb().userId;
  if (!id || (typeof navigator !== 'undefined' && navigator.onLine === false)) return [];
  const { loadSupabaseBrowser } = await import('@/core/supabase/lazy');
  const client = await loadSupabaseBrowser();
  const rows: StrengthLog[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('set_logs')
      .select('id,exercise_id,weight_kg,reps,drop_index,deleted_at,workout_sessions!inner(training_date),exercises(name_ar,name_en)')
      .eq('player_id', id).order('id').range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data.map(({ workout_sessions, exercises, ...row }) => ({ ...row, training_date: workout_sessions.training_date,
      name_ar: exercises?.name_ar, name_en: exercises?.name_en })));
    if (data.length < 500) return rows;
  }
}

export async function readStrength(snapshot: ProgramSnapshot | null, locale: Locale = 'ar', remote: StrengthLog[] = []): Promise<StrengthHistory> {
  const t = createT(messages, locale);
  const db = localDb();
  const [logs, sessions] = await Promise.all([db.set_logs.toArray(), db.workout_sessions.toArray()]);
  const dates = new Map(sessions.map((session) => [session.id, session.training_date]));
  const names: Record<string, string> = {};
  for (const row of remote) names[row.exercise_id] = (locale === 'en' ? row.name_en : row.name_ar || row.name_en) || t('exercise');
  for (const day of snapshot?.days ?? []) {
    for (const exercise of day.exercises) names[exercise.exercise_id] = (locale === 'en' ? exercise.name_en : exercise.name_ar || exercise.name_en) || t('exercise');
  }
  const remoteDates = new Map(remote.map(row => [row.id, row.training_date]));
  const sets = mergeStrength(logs.map(log => ({ ...log, training_date: dates.get(log.session_id) ?? remoteDates.get(log.id) ?? '' })), remote);
  return { sets, names };
}
