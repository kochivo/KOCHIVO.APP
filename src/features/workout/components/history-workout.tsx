'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr as formatDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { exerciseName } from '@/lib/display-name';
import { starterText } from '@/lib/starter-text';
import type { HistoryWorkout } from '../data/history-grouping';
import type { HistoryName } from '../data/history';
import { messages } from '../messages';
import { HistorySets } from './history-sets';

export function HistoryWorkoutRow({ workout, title, names, exerciseId }: {
  workout: HistoryWorkout; title: string; names: HistoryName[]; exerciseId?: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const exercises = exerciseId ? workout.exercises.filter(row => row.id === exerciseId) : workout.exercises;
  return <details className="glass rounded-card p-4" open={exerciseId ? true : undefined}>
    <summary className="min-h-12 cursor-pointer space-y-1">
      <span className="block font-bold">{formatDate(workout.training_date, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</span>
      <span className="text-sm text-muted"><bdi>{starterText(title, locale)}</bdi>{' · '}
        {t('historySets', { count: formatNumber(exercises.reduce((count, exercise) => count + exercise.sets.length, 0), locale) })}</span>
    </summary>
    <div className="mt-3 space-y-4">{exercises.length ? exercises.map(exercise => {
      const name = names.find(row => row.id === exercise.id);
      return <section key={exercise.id} className="space-y-2">
        <h3 className="font-bold"><bdi>{name ? exerciseName(name, locale) : t('unknownExercise')}</bdi></h3>
        <HistorySets sets={exercise.sets} />
      </section>;
    }) : <p className="text-muted">{t('noSetsForThisExercise')}</p>}</div>
  </details>;
}
