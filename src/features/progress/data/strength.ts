import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { Locale } from '@/core/i18n/locale';

import { localDb } from '@/core/offline';
import type { ProgramSnapshot } from '@/features/player-home';
import type { StrengthSet } from '../trends';

export interface StrengthHistory { sets: StrengthSet[]; names: Record<string, string> }

export async function readStrength(snapshot: ProgramSnapshot | null, locale: Locale = 'ar'): Promise<StrengthHistory> {
  const t = createT(messages, locale);
  const db = localDb();
  const [logs, sessions] = await Promise.all([db.set_logs.toArray(), db.workout_sessions.toArray()]);
  const dates = new Map(sessions.map((session) => [session.id, session.training_date]));
  const names: Record<string, string> = {};
  for (const day of snapshot?.days ?? []) {
    for (const exercise of day.exercises) names[exercise.exercise_id] = (locale === 'en' ? exercise.name_en : exercise.name_ar || exercise.name_en) || t('exercise');
  }
  const sets = logs.filter((log) => !log.deleted_at && dates.has(log.session_id)).map((log) => ({
    exercise_id: log.exercise_id, training_date: dates.get(log.session_id) ?? '', weight_kg: log.weight_kg, reps: log.reps,
  }));
  return { sets, names };
}
