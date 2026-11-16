'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { Button } from '@/ui/button';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages } from '../pain/messages';
import { safePainSwap } from '../pain-safe-swap';

type State = Pick<ReturnType<typeof useFocusSession>,
  'current' | 'painCarried' | 'painReports' | 'disabled' | 'switchExercise' | 'skipExercise'>;

export function PainCarried({ state }: { state: State }) {
  const t = useT(messages);
  const locale = useLocale();
  const report = state.painCarried?.[0];
  const current = state.current;
  if (!report || !current) return null;
  const exercise = current.exercise;
  const alternative = (current.dropIndex ?? 0) === 0 ? safePainSwap(report.area,
    (exercise.alternative_exercises ?? []).filter(row => row.id !== exercise.exercise_id && exercise.alternatives?.includes(row.id)),
    exercise.pattern, state.painReports) : undefined;
  return <section role="status" className="glass space-y-stack rounded-card p-card">
    <p>{t('carried', { area: t(report.area) })}</p>
    {alternative && <Button block className="min-h-12" disabled={state.disabled}
      onClick={() => state.switchExercise(alternative.id)}>{t('switchTo', { name: exerciseName(alternative, locale) })}</Button>}
    <Button block variant="secondary" className="min-h-12" disabled={state.disabled}
      onClick={() => void state.skipExercise(exercise.id)}>{t('skipExercise')}</Button>
  </section>;
}
