'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Link from 'next/link';
import { ExerciseLightbox } from './exercise-lightbox';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import type { LastSession } from '../data/last-performance';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { exerciseMuscle } from '../exercise-muscle';

const muscleKeys = { chest: 'chest', back: 'back', waist: 'waist', 'upper arms': 'upperArms', 'lower arms': 'lowerArms',
  'upper legs': 'upperLegs', 'lower legs': 'lowerLegs', shoulders: 'shoulders', cardio: 'cardio' } as const;

export function ExerciseHeader({ exercise, last, detailsOnly = false }: { exercise: SnapshotExercise; last: LastSession | null; detailsOnly?: boolean }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
  const v6 = captainWorkspaceEnabled();
  const name = exerciseName(exercise, locale);
  const muscle = exerciseMuscle(exercise);
  const muscleKey = muscle && Object.hasOwn(muscleKeys, muscle) ? muscleKeys[muscle as keyof typeof muscleKeys] : null;
  return <section className={v6 ? 'space-y-3' : 'glass-strong flex items-center gap-4 rounded-card p-4'}>
    {!v6 && exercise.media_path && <ExerciseLightbox src={exerciseMediaUrl(exercise.media_path)} name={name} />}
    <div className="min-w-0 space-y-2">
      {!detailsOnly && <h1 className="text-2xl font-extrabold"><bdi>{name}</bdi></h1>}
      {v6 && <p className="text-xs text-faint">{muscleKey ? <>{v6t(muscleKey)} · </> : muscle ? <>{muscle} · </> : null}<bdi>{v6t('prescription', { sets: formatNumber(exercise.sets, locale),
        reps: exercise.reps_max === null ? t('toFailure') : `${formatNumber(exercise.reps_min, locale)}–${formatNumber(exercise.reps_max, locale)}` })}</bdi> · {v6t('rest', { seconds: formatNumber(exercise.rest_seconds, locale) })}</p>}
      <p className="text-sm text-muted"><bdi>{t('targetReps', { count: exercise.reps_max === null ? t('toFailure') :
        exercise.reps_min === exercise.reps_max ? formatNumber(exercise.reps_min, locale) :
          t('targetRange', { min: formatNumber(exercise.reps_min, locale), max: formatNumber(exercise.reps_max, locale) }) })}</bdi>
        {exercise.rir != null && <bdi>{t('rirSuffix', { count: formatNumber(exercise.rir, locale) })}</bdi>}</p>
      {last?.sets.length ? <p className="text-sm text-muted">{t('lastTime')} <bdi dir="ltr">{last.sets.map((set) =>
        `${formatNumber(set.weight_kg ?? 0, locale)}×${formatNumber(set.reps ?? 0, locale)}`).join(' · ')}</bdi></p> : null}
      <div className="flex flex-wrap items-center gap-x-6">
        {exercise.video_url?.startsWith('https://') && <a href={exercise.video_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center text-lime underline">{t('watchVideo')}</a>}
        <Link className="inline-flex min-h-12 items-center text-lime underline" href={`/player/history?exercise=${encodeURIComponent(exercise.exercise_id)}`}>
          {t('seeHistory')}
        </Link>
      </div>
    </div>
    {v6 && !detailsOnly && exercise.media_path && <ExerciseLightbox src={exerciseMediaUrl(exercise.media_path)} name={name} large />}
    {v6 && !detailsOnly && exercise.notes && <p className="glass rounded-card p-4 text-sm text-muted">{exercise.notes}</p>}
  </section>;
}
