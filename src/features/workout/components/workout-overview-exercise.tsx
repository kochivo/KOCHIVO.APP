'use client';
import { useCallback, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { useLastSession } from '../hooks/use-last-session';
import { messages } from '../messages';
import { ExerciseLightbox } from './exercise-lightbox';
import { ExerciseHeader } from './exercise-header';
import { messages as setMessages } from '@/lib/training/messages';

export function WorkoutOverviewExercise({ exercise, sessionId, playerId, tag }: {
  exercise: SnapshotExercise; sessionId: string; playerId?: string; tag?: string | null;
}) {
  const t = useT(messages);
  const st = useT(setMessages);
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const history = useLastSession(playerId, exercise.exercise_id, sessionId, useCallback(() => setFailed(true), []), attempt);
  const previous = history.last?.sets.find(row => row.weight_kg !== null);
  const name = exerciseName(exercise, locale);
  const reps = exercise.reps_max === null ? t('toFailure') : exercise.reps_min === exercise.reps_max
    ? formatNumber(exercise.reps_min, locale) : t('targetRange', { min: formatNumber(exercise.reps_min, locale), max: formatNumber(exercise.reps_max, locale) });
  return <li aria-busy={!history.ready} className="flex items-center gap-stack rounded-[22px] border border-line-soft bg-surface p-stack">
    <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-exercise-media">
      {exercise.media_path && <ExerciseLightbox src={exerciseMediaUrl(exercise.media_path)} name={name} thumbnail />}
    </div>
    <div className="flex min-w-0 flex-1 flex-col gap-inline">
      <div className="flex flex-wrap gap-inline text-xs">
        {tag && <bdi className="rounded-control bg-lime-soft px-inline py-inline text-lime">{tag}</bdi>}
        {exercise.set_plan?.some(row => row.drop) && <span className="rounded-full bg-warn-soft px-stack py-inline text-warn">{st('drop')}</span>}
      </div>
      <b className="text-md"><bdi>{name}</bdi></b>
      <ExerciseHeader exercise={exercise} last={null} prescriptionOnly />
      <span className="text-xs text-muted">{t('v3Prescription', { sets: formatNumber(exercise.sets, locale), reps })}
        {previous?.weight_kg != null && t('v3PreviousWeight', { weight: formatNumber(previous.weight_kg, locale) })}</span>
      {failed && <button type="button" className="min-h-12 text-start text-xs text-muted" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>{t('tryAgain')}</button>}
    </div>
  </li>;
}
