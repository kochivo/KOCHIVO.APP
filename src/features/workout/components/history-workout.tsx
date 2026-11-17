'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr as formatDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { exerciseName } from '@/lib/display-name';
import { starterText } from '@/lib/starter-text';
import type { HistorySet, HistoryWorkout } from '../data/history-grouping';
import { bestSet } from '../data/history-grouping';
import { detectPr } from '../pr';
import type { HistoryName } from '../data/history';
import { messages } from '../messages';
import { messages as v3Messages } from '../history-v3-messages';
import { HistorySets } from './history-sets';
import { ChevronLeft } from 'lucide-react';
import { formatVolume } from './workout-v3-model';
import { messages as v4Messages } from '../v4/messages';

export function sessionPrIds(workouts: readonly HistoryWorkout[]) {
  const sets = workouts.flatMap(workout => workout.exercises.flatMap(exercise => exercise.sets))
    .filter(set => !set.deleted_at).sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  const best = new Map<string, HistorySet>();
  const records = new Set<string>();
  for (let start = 0; start < sets.length;) {
    let end = start + 1;
    while (end < sets.length && sets[end]?.completed_at === sets[start]?.completed_at) end++;
    // Equal timestamps cannot establish a previous performance for one another.
    const batch = sets.slice(start, end);
    for (const set of batch) {
      const previous = best.get(set.exercise_id);
      if (detectPr(previous ? [previous] : [], set)) records.add(set.session_id);
    }
    for (const set of batch) {
      if (set.weight_kg === null || set.reps === null || set.reps < 1) continue;
      const previous = best.get(set.exercise_id);
      const next = bestSet(previous ? [previous, set] : [set]);
      if (next) best.set(set.exercise_id, next);
    }
    start = end;
  }
  return records;
}

export function HistoryWorkoutRow({ workout, title, names, exerciseId, v3 = false, hasPr = false }: {
  workout: HistoryWorkout; title: string; names: HistoryName[]; exerciseId?: string; v3?: boolean; hasPr?: boolean;
}) {
  const t = useT(messages);
  const v3t = useT(v3Messages);
  const vt = useT(v4Messages);
  const locale = useLocale();
  const exercises = exerciseId ? workout.exercises.filter(row => row.id === exerciseId) : workout.exercises;
  const minutes = Math.max(0, Math.round((Date.parse(workout.completed_at ?? workout.started_at) - Date.parse(workout.started_at)) / 60000));
  const volume = v3 ? formatVolume(workout.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) =>
    sum + (set.weight_kg ?? 0) * (set.reps ?? 0), 0), 0), locale) : undefined;
  return <details className={v3 ? 'glass group rounded-card px-card py-stack' : 'glass rounded-card p-card'} open={exerciseId ? true : undefined}>
    <summary className={v3 ? 'flex min-h-12 cursor-pointer list-none items-center gap-stack [&::-webkit-details-marker]:hidden' : 'min-h-12 cursor-pointer space-y-inline'}>
      {v3 ? <>
        <span className="flex w-12 shrink-0 flex-col items-center justify-center">
          <b className="font-display text-title">{formatDate(workout.training_date, { day: 'numeric' }, locale)}</b>
          <span className="text-micro text-muted">{formatDate(workout.training_date, { weekday: 'short' }, locale)}</span>
        </span>
        <span className="min-w-0 flex-1"><b className="text-sm"><bdi>{starterText(title, locale)}</bdi></b>
          <span className="block text-micro text-muted">{v3t('summary', { min: formatNumber(minutes, locale), sets: formatNumber(workout.setCount, locale) })}
            {volume && <> · {vt('historyVolume', { value: volume.value, unit: t(volume.unit) })}</>}
          </span>
        </span>
        {hasPr && <span className="tone-warn rounded-md px-inline text-micro font-bold">{v3t('pr')}</span>}
        <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted ltr:rotate-180 group-open:rotate-270" />
      </> : <>
      <span className="block font-bold">{formatDate(workout.training_date, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</span>
      <span className="text-sm text-muted"><bdi>{starterText(title, locale)}</bdi>{' · '}
        {t('historySets', { count: formatNumber(exercises.reduce((count, exercise) => count + exercise.sets.length, 0), locale) })}</span></>}
    </summary>
    <div className="mt-stack space-y-card-gap">{exercises.length ? exercises.map(exercise => {
      const name = names.find(row => row.id === exercise.id);
      return <section key={exercise.id} className="space-y-inline">
        <h3 className="font-bold"><bdi>{name ? exerciseName(name, locale) : t('unknownExercise')}</bdi></h3>
        <HistorySets sets={exercise.sets} />
      </section>;
    }) : <p className="text-muted">{t('noSetsForThisExercise')}</p>}</div>
  </details>;
}
