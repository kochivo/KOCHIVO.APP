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
import { Button } from '@/ui/button';
import { exerciseGroups, supersetLabel, supersetTag } from '@/lib/superset';
import { messages as setMessages } from '@/lib/training/messages';

export function WorkoutOverview({ state, progress, onStart, onBack, playerId }: {
  state: ReturnType<typeof useFocusSession>; progress: ReturnType<typeof useWarmupSession>;
  onStart: () => void; onBack: () => void; playerId?: string;
}) {
  const t = useT(messages);
  const st = useT(setMessages);
  const locale = useLocale();
  const day = state.day;
  if (!day) return null;
  const warmup = day.warmup ?? { items: [], ramp: false };
  const minutes = Math.round(day.exercises.reduce((sum, exercise) => sum + exercise.sets * (40 + exercise.rest_seconds), 0) / 300) * 5
    + warmupMinutes(warmup) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0);
  return <>
    <header className="flex items-center gap-stack">
      <button type="button" aria-label={t('back')} onClick={onBack} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised"><ArrowRight aria-hidden className="dir-icon size-5" /></button>
      <div><h1 style={{ fontFamily: 'inherit', fontWeight: 900 }} className="text-h">{starterText(day.title, locale)}</h1>
        <span className="text-xs text-muted">{t('v3Summary', { minutes: formatNumber(minutes, locale), count: formatNumber(day.exercises.length, locale) })}</span></div>
    </header>
    <WarmupCard warmup={warmup} checked={progress.checked} disabled={progress.loading || progress.error} onToggle={progress.toggle} />
    <b className="px-inline pt-inline text-md">{t('v3Exercises')}</b>
    <ol id="workout-exercises" className="flex flex-col gap-inline">
      {exerciseGroups(day.exercises).map(group => {
        const exercise = group[0];
        if (!exercise) return null;
        if (group.length > 1) return <li key={exercise.id} className="space-y-stack rounded-card border border-lime/40 bg-lime-soft p-stack">
          <header className="flex flex-wrap justify-between gap-inline text-xs"><b className="text-lime">{st('superset', { letter: supersetLabel(day.exercises, exercise) ?? '' })}</b>
            <span className="text-muted">{st('rest', { seconds: group.at(-1)?.rest_seconds ?? 0 })}</span></header>
          <ol className="space-y-stack">{group.map((member, index) => <li key={member.id}>
            {index > 0 && <p className="py-inline text-center text-xs text-lime">{st('noRest')}</p>}
            <ol><WorkoutOverviewExercise exercise={member} tag={supersetTag(day.exercises, member)} sessionId={state.session?.id ?? ''} playerId={playerId} /></ol>
          </li>)}</ol>
        </li>;
        if (day.exercises.indexOf(exercise) < 4) return <WorkoutOverviewExercise key={exercise.id} exercise={exercise} sessionId={state.session?.id ?? ''} playerId={playerId} />;
        return <li key={exercise.id} className="min-h-12 rounded-[22px] border border-dashed border-line-soft px-card text-row text-muted">
        <details><summary className="flex min-h-12 cursor-pointer items-center py-stack">{t('v3More', { name: exerciseName(exercise, locale) })}</summary>
          <ol><WorkoutOverviewExercise exercise={exercise} sessionId={state.session?.id ?? ''} playerId={playerId} /></ol>
        </details>
      </li>;
      })}
    </ol>
    {progress.error && <ErrorState message={t('couldntReadTheWorkoutOnYourPhone')} retryLabel={t('tryAgain')} onRetry={state.retry} />}
    {warmup.ramp && state.current && <RampLine day={day} exercise={state.current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />}
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-gradient-to-b from-bg/0 to-bg to-35% px-page-x pt-card pb-[max(24px,env(safe-area-inset-bottom))]">
      <Button type="button" style={{ fontFamily: 'inherit' }} onClick={onStart} disabled={warmup.items.length > 0 && (progress.loading || progress.error)}
        variant={'primary'} block={false} className={"flex h-16 w-full items-center justify-center gap-stack text-title font-black disabled:opacity-50"}><KoPlay aria-hidden className="size-[22px]" />{t('v3Start')}</Button>
    </div>
  </>;
}
