'use client';
import { ArrowRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { warmupMinutes } from '@/features/programs';
import { exerciseName } from '@/lib/display-name';
import { starterText } from '@/lib/starter-text';
import { formatNumber } from '@/lib/format';
import { KoPlay } from '@/ui/icons';
import { ErrorState } from '@/ui/error-state';
import type { useFocusSession } from '../hooks/use-focus-session';
import type { useWarmupSession } from '../hooks/use-warmup-session';
import { messages } from '../messages';
import { WarmupCard } from './warmup-card';
import { WorkoutOverviewExercise } from './workout-overview-exercise';
import { RampLine } from './ramp-line';

export function WorkoutOverview({ state, progress, onStart, onBack, playerId }: {
  state: ReturnType<typeof useFocusSession>; progress: ReturnType<typeof useWarmupSession>;
  onStart: () => void; onBack: () => void; playerId?: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const day = state.day;
  if (!day) return null;
  const warmup = day.warmup ?? { items: [], ramp: false };
  const minutes = Math.round(day.exercises.reduce((sum, exercise) => sum + exercise.sets * (40 + exercise.rest_seconds), 0) / 300) * 5
    + warmupMinutes(warmup) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0);
  return <>
    <header className="flex items-center gap-3">
      <button type="button" aria-label={t('back')} onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised"><ArrowRight aria-hidden className="dir-icon size-5" /></button>
      <div><h1 style={{ fontFamily: 'inherit', fontWeight: 900 }} className="text-[22px]">{starterText(day.title, locale)}</h1>
        <span className="text-xs text-muted">{t('v3Summary', { minutes: formatNumber(minutes, locale), count: formatNumber(day.exercises.length, locale) })}</span></div>
    </header>
    <WarmupCard warmup={warmup} checked={progress.checked} disabled={progress.loading || progress.error} onToggle={progress.toggle} />
    <b className="px-1 pt-1 text-[15px]">{t('v3Exercises')}</b>
    <ol id="workout-exercises" className="flex flex-col gap-2">
      {day.exercises.slice(0, 4).map(exercise => <WorkoutOverviewExercise key={exercise.id} exercise={exercise} sessionId={state.session?.id ?? ''} playerId={playerId} />)}
      {day.exercises.slice(4).map(exercise => <li key={exercise.id} className="min-h-12 rounded-[22px] border border-dashed border-line-soft px-3.5 text-[13px] text-muted">
        <details><summary className="flex min-h-12 cursor-pointer items-center py-2.5">{t('v3More', { name: exerciseName(exercise, locale) })}</summary>
          <ol><WorkoutOverviewExercise exercise={exercise} sessionId={state.session?.id ?? ''} playerId={playerId} /></ol>
        </details>
      </li>)}
    </ol>
    {progress.error && <ErrorState message={t('couldntReadTheWorkoutOnYourPhone')} retryLabel={t('tryAgain')} onRetry={state.retry} />}
    {warmup.ramp && state.current && <RampLine day={day} exercise={state.current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />}
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-gradient-to-b from-bg/0 to-bg to-35% px-[18px] pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
      <button type="button" style={{ fontFamily: 'inherit' }} onClick={onStart} disabled={warmup.items.length > 0 && (progress.loading || progress.error)}
        className="flex h-16 w-full items-center justify-center gap-2.5 rounded-full bg-lime text-[19px] font-black text-on-lime disabled:opacity-50"><KoPlay aria-hidden className="size-[22px]" />{t('v3Start')}</button>
    </div>
  </>;
}
