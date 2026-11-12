'use client';
import { useCallback } from 'react';
import type { SnapshotDay, SnapshotExercise } from '@/core/offline';
import { useLiveQuery } from '@/core/offline';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { firstWeightedExercise, rampPrescription } from '../data/warmup-state';
import type { LastSession } from '../data/last-performance';
import { messages } from '../warmup/messages';

export function RampLine({ day, exercise, bodyweight, last }: {
  day: SnapshotDay; exercise: SnapshotExercise; bodyweight: boolean; last: LastSession | null;
}) {
  const locale = useLocale();
  const style = useArabicStyle();
  const t = useT(messages);
  const read = useCallback(() => day.exercises.filter(item => {
    try { return window.localStorage.getItem(`bodyweight:${item.exercise_id}`) === 'true'; }
    catch { return false; }
  }).map(item => item.exercise_id), [day.exercises]);
  const storedBodyweight = useLiveQuery(read);
  const first = firstWeightedExercise(day.exercises, id => id === exercise.exercise_id ? bodyweight : Boolean(storedBodyweight?.includes(id)));
  if (!day.warmup?.ramp || exercise.id !== first) return null;
  const weight = last?.sets.at(-1)?.weight_kg ?? null;
  return <p className="text-xs text-faint">{t('ramp', { sets: rampPrescription(weight, locale, style) })}</p>;
}
