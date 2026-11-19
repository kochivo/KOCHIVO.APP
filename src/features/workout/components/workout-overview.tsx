'use client';
import { useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { warmupMinutes } from '@/features/programs';
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
import { IconButton } from '@/ui/icon-button';
import { StatStrip } from '@/ui/stat-strip';
import { messages as v4Messages } from '../v4/messages';
import { exerciseGroups, supersetLabel, supersetTag } from '@/lib/superset';
import { messages as setMessages } from '@/lib/training/messages';

export function WorkoutOverview({ state, progress, onStart, onBack, playerId }: {
  state: ReturnType<typeof useFocusSession>; progress: ReturnType<typeof useWarmupSession>;
  onStart: () => void; onBack: () => void; playerId?: string;
}) {
  const t = useT(messages);
  const st = useT(setMessages);
  const vt = useT(v4Messages);
  const locale = useLocale();
  const focusHeading = useCallback((heading: HTMLHeadingElement | null) => heading?.focus(), []);
  const day = state.day;
  if (!day) return null;
  const warmup = day.warmup ?? { items: [], ramp: false };
  const minutes = Math.round(day.exercises.reduce((sum, exercise) => sum + exercise.sets * (40 + exercise.rest_seconds), 0) / 300) * 5
    + warmupMinutes(warmup) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0);
  const remaining = new Set(state.remainingForPain?.());
  const finished = (id: string, sets: number) => !remaining.has(id) && state.doneSets.filter(row =>
    row.program_exercise_id === id && (row.drop_index ?? 0) === 0).length >= sets;
  const number = (value: number) => formatNumber(value, locale);
  return <>
    <header className="flex items-center gap-stack">
      <IconButton aria-label={t('back')} onClick={onBack}><ArrowRight aria-hidden className="dir-icon size-5" /></IconButton>
      <div><h1 ref={focusHeading} tabIndex={-1} className="text-md font-bold">{starterText(day.title, locale)}</h1>
        <span className="text-xs text-muted">{t('v3Summary', { minutes: formatNumber(minutes, locale), count: formatNumber(day.exercises.length, locale) })}</span></div>
    </header>
    <StatStrip className="max-sm:grid-cols-3! [&>div]:px-stack" items={[
      { label: vt('exercises'), value: number(day.exercises.length) },
      { label: vt('sets'), value: number(day.exercises.reduce((total, exercise) => total + exercise.sets, 0)) },
      { label: vt('minutes'), value: number(minutes) },
    ]} />
    <WarmupCard warmup={warmup} checked={progress.checked} disabled={progress.loading || progress.error} onToggle={progress.toggle} v4 />
    <ol id="workout-exercises" className="flex flex-col gap-inline">
      {exerciseGroups(day.exercises).map(group => {
        const exercise = group[0];
        if (!exercise) return null;
        if (group.length > 1) return <li key={exercise.id} className="space-y-stack rounded-card border border-lime/40 bg-lime-soft p-stack">
          <header className="flex flex-wrap justify-between gap-inline text-xs"><b className="text-lime">{st('superset', { letter: supersetLabel(day.exercises, exercise) ?? '' })}</b>
            <span className="text-muted">{st('rest', { seconds: group.at(-1)?.rest_seconds ?? 0 })}</span></header>
          <ol className="space-y-stack">{group.map((member, index) => <li key={member.id}>
            {index > 0 && <p className="py-inline text-center text-xs text-lime">{st('noRest')}</p>}
            <ol><WorkoutOverviewExercise exercise={member} done={finished(member.id, member.sets)} tag={supersetTag(day.exercises, member)} sessionId={state.session?.id ?? ''} playerId={playerId} /></ol>
          </li>)}</ol>
        </li>;
        return <WorkoutOverviewExercise key={exercise.id} exercise={exercise} done={finished(exercise.id, exercise.sets)} sessionId={state.session?.id ?? ''} playerId={playerId} />;
      })}
    </ol>
    {progress.error && <ErrorState message={t('couldntReadTheWorkoutOnYourPhone')} retryLabel={t('tryAgain')} onRetry={state.retry} />}
    {warmup.ramp && state.current && <RampLine day={day} exercise={state.current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />}
    <div data-action-bar className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-gradient-to-b from-bg/0 to-bg to-35% px-page-x pt-card pb-[max(24px,env(safe-area-inset-bottom))]">
      <Button type="button" size="lg" onClick={onStart} disabled={warmup.items.length > 0 && (progress.loading || progress.error)}
        block><KoPlay aria-hidden className="size-5" />{t('v3Start')}</Button>
    </div>
  </>;
}
