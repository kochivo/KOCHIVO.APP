import { rampSets } from '@/features/programs';
import { createT } from '@/core/i18n/messages';
import type { Locale, ArabicStyle } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { messages } from '../warmup/messages';

export { readWarmupProgress, saveWarmupProgress, warmupPending } from './warmup-progress';

export function firstWeightedExercise(exercises: readonly { id: string; exercise_id: string }[], bodyweight: (id: string) => boolean): string | undefined {
  return exercises.find(exercise => !bodyweight(exercise.exercise_id))?.id;
}

export function rampPrescription(workingKg: number | null, locale: Locale, style: ArabicStyle = 'egyptian'): string {
  const t = createT(messages, locale, style);
  return rampSets(workingKg !== null && workingKg > 0 ? workingKg : null).map(row => t(row.kg === null ? 'percentSet' : 'kgSet', {
    weight: formatNumber(row.kg ?? row.percent, locale), reps: formatNumber(row.reps, locale),
  })).join(t('separator'));
}
