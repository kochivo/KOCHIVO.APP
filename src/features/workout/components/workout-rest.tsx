'use client';
import { useCallback } from 'react';
import { ChevronRight, Play, Volume2, VolumeX } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { exerciseMediaUrl } from '@/core/storage';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { cn } from '@/lib/cn';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages } from '../messages';
import { messages as v4Messages } from '../v4/messages';
import { formatRest } from '../rest';
import { ExerciseLightbox } from './exercise-lightbox';
import { alternativeStep, loggedStep } from '../data/exercise-choices';
import styles from './workout-media.module.css';

export function WorkoutRest({ state, onBack }: { state: ReturnType<typeof useFocusSession>; onBack: () => void }) {
  const focusHeading = useCallback((heading: HTMLHeadingElement | null) => heading?.focus(), []);
  const t = useT(messages);
  const vt = useT(v4Messages);
  const locale = useLocale();
  const { rest, current } = state;
  const previousStep = state.queue[state.progress - 2];
  const previousLog = previousStep && state.doneSets.find(row => row.program_exercise_id === previousStep.exercise.id &&
    row.set_index === previousStep.setIndex && (row.drop_index ?? 0) === (previousStep.dropIndex ?? 0));
  const previous = previousLog ? loggedStep(previousStep, previousLog.exercise_id, t('unknownExercise')) :
    alternativeStep(previousStep, state.selectedExercises[previousStep?.exercise.id ?? '']);
  const nextName = current && exerciseName(current.exercise, locale);
  const elapsed = rest.total > 0 ? Math.min(1, rest.remaining / rest.total) : 0;
  return <section className="flex min-h-[calc(100dvh-5rem)] flex-col gap-card-gap">
    <header className="flex items-center gap-stack">
      <IconButton aria-label={t('back')} onClick={onBack}><ChevronRight aria-hidden className="dir-icon size-5" /></IconButton>
      <div className="min-w-0 flex-1">
        <h1 ref={focusHeading} tabIndex={-1} className="text-md font-bold">{t('rest')}</h1>
        {previous && <p className="text-micro text-muted">{vt('restAfter', {
          exercise: exerciseName(previous.exercise, locale), set: formatNumber(previous.setIndex, locale),
        })}</p>}
      </div>
      <IconButton aria-label={t('sound')} aria-pressed={rest.sound} onClick={rest.toggleSound}>
        {rest.sound ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
      </IconButton>
    </header>
    <div className="grid flex-1 place-items-center py-section">
      <div className={cn('relative grid aspect-square w-64 max-w-full place-items-center rounded-full',
        rest.flashing && 'motion-safe:animate-pulse')}>
        <svg aria-hidden viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" fill="none" strokeWidth="10">
          <circle cx="60" cy="60" r="52" stroke="currentColor" className="text-line" />
          <circle cx="60" cy="60" r="52" stroke="currentColor" pathLength="1" strokeDasharray="1"
            strokeDashoffset={1 - elapsed} strokeLinecap="round" className="text-lime" />
        </svg>
        <div className="relative text-center">
          <output aria-label={t('restTimeRemaining')} aria-live="off" className="engraved font-display text-stat-large-wide font-extrabold tabular-nums"><bdi>{formatRest(rest.remaining, locale)}</bdi></output>
          <p className="mt-inline text-xs text-muted">{vt('restOf', { time: formatRest(rest.total, locale) })}</p>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-inline">
      <Button variant="secondary" size="lg" onClick={() => rest.adjust(-15)}>{vt('minusRest')}</Button>
      <Button variant="secondary" size="lg" onClick={() => rest.adjust(15)}>{vt('plusRest')}</Button>
    </div>
    {current && nextName && <aside className="glass flex items-center gap-stack rounded-card p-stack">
      <div className={`grid size-12 shrink-0 place-items-center overflow-hidden rounded-control ${styles.placeholder}`}>
        {current.exercise.media_path ? <ExerciseLightbox src={exerciseMediaUrl(current.exercise.media_path)} name={nextName} thumbnail compact /> : <Play aria-hidden className="size-4 text-muted" />}
      </div>
      <div className="min-w-0"><p className="text-micro text-muted">{t('upNext')}</p>
        <p className="text-sm font-bold">{vt('nextSet', { set: formatNumber(current.setIndex, locale), exercise: nextName })}</p>
        <p className="text-micro text-muted">{vt('nextNumbers', { weight: formatNumber(state.weight, locale), reps: formatNumber(state.reps, locale) })}</p>
      </div>
    </aside>}
    <Button block size="lg" onClick={rest.skip}>{vt('ready')}</Button>
  </section>;
}
