'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, Dumbbell } from 'lucide-react';
import { localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { CardioCards, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, SyncPill } from '@/ui';
import { SetControls } from './set-controls';
import { useFocusSession } from '../hooks/use-focus-session';
import { useWakeLock } from '../hooks/use-wake-lock';
import { DonePanel } from './done-panel';
import { ExerciseHeader } from './exercise-header';
import { NextUp } from './next-up';
import { RestPanel } from './rest-panel';
import { SetDots } from './set-dots';
import { MediaStatus } from './media-status';
import { restAnnouncement } from '../rest';
import { starterText } from '@/lib/starter-text';
import { localDb, useLiveQuery } from '@/core/offline';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { SetRows } from './set-rows';
import { messages as v6Messages } from '../v6-messages';
import { WorkoutClock } from './workout-clock';
import Link from 'next/link';

const readPlan = () => localDb().program_snapshot.get('active');

const PrBurst = dynamic(() => import('./pr-burst').then(module => module.PrBurst), { ssr: false });
const SessionFeedback = dynamic(() => import('./session-feedback').then(module => module.SessionFeedback), {
  ssr: false, loading: () => <LoadingState />,
});
const FormCheckButton = dynamic(() => import('./form-check-button').then(module => module.FormCheckButton), { ssr: false });
const CoachReductionBanner = dynamic(() => import('@/features/readiness').then(module => module.CoachReductionBanner), { ssr: false });

export function FocusScreen({ dayId, playerId }: { dayId: string; playerId?: string }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  const router = useRouter();
  const { now, online } = useCalendarClock();
  const today = now ? localDate(now, timezone) : '';
  useWakeLock();
  const state = useFocusSession(dayId, today, playerId);
  const plan = useLiveQuery(readPlan);
  // The server checks the assigned plan, including on a reduced readiness day.
  const plannedDay = plan?.days.find(day => day.id === dayId) ?? (state.decision === 'reduce' ? undefined : state.day);
  const workout = state.session?.completed_at && plannedDay ? {
    startedAt: state.session.started_at, completedAt: state.session.completed_at,
    loggedSets: state.doneSets.length,
    plannedSets: plannedDay.exercises.reduce((total, exercise) => total + exercise.sets, 0),
    plannedSeconds: plannedDay.exercises.reduce((total, exercise) => total + exercise.sets * (exercise.rest_seconds + 40), 0),
  } : undefined;
  const { current, rest } = state;
  const lastSet = state.doneSets.filter((row) => row.program_exercise_id === current?.exercise.id)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{restAnnouncement(rest.remaining, rest.endsAt !== null, t)}</p>
    {state.pr && <PrBurst key={state.pr.id} pr={state.pr} onDismiss={state.dismissPr} />}
    <header className="flex flex-wrap items-center gap-3">
      <IconButton aria-label={t('back')} onClick={() => router.push('/player')}><ArrowRight aria-hidden className="dir-icon" /></IconButton>
      <p className="min-w-0 flex-1 truncate font-bold">{v6 && state.day ? v6t('progress', { day: starterText(state.day.title, locale),
        current: formatNumber(Math.max(1, state.day.exercises.findIndex(exercise => exercise.id === current?.exercise.id) + 1), locale),
        total: formatNumber(state.day.exercises.length, locale) }) : state.day ? starterText(state.day.title, locale) : t('workout')}</p>
      {v6 && <WorkoutClock startedAt={state.session?.started_at} />}
      <SyncPill state={!online ? 'offline' : state.parked && state.parked > 0 ? 'attention' : state.pending === undefined || state.pending > 0 ? 'pending' : 'synced'} pending={state.pending} onRetry={state.retrySync} />
      <MediaStatus />
    </header>
    {state.decision === 'reduce' && <CoachReductionBanner />}
    {state.error ? <ErrorState message={state.error} retryLabel={t('tryAgain')} onRetry={state.retry} /> :
      state.loading ? <LoadingState /> : state.programFinished ?
        <EmptyState icon={Dumbbell} title={t('programFinished')} body={t('renewProgram')} action={{ label: t('backToHome'), href: '/player' }} /> : !state.day ?
        <EmptyState icon={Dumbbell} title={t('thisWorkoutIsntInYourProgram')} body={t('goHomeToSeeYourCurrentWorkout')} action={{ label: t('backToHome'), href: '/player' }} />
      : state.queue.length === 0 ? !state.day.cardio?.length && <EmptyState icon={Dumbbell} title={t('noExercisesForThisDay')} body={t('yourCoachIsPreparingYourWorkout')} action={{ label: t('messageCoach'), href: '/player/captain' }} /> : <>
        <p className="text-sm text-muted">{t('setProgress', { value0: formatNumber(state.progress, locale), value1: formatNumber(state.queue.length, locale) })}</p>
        <ProgressBar value={state.doneSets.length} max={state.queue.length} aria-label={t('setProgress', { value0: formatNumber(state.progress, locale), value1: formatNumber(state.queue.length, locale) })} />
        {state.finished ? state.session ? <SessionFeedback key={state.session.id} sessionId={state.session.id}
          workout={workout} hasFeedback={state.session.session_rpe != null || Boolean(state.session.player_note)} /> : <DonePanel workout={workout} /> : current ? <>
          <ExerciseHeader exercise={current.exercise} last={state.lastSession} />
          {v6 ? <SetRows state={state} /> : <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets}
            onEdit={state.edit} disabled={state.disabled} />}
          {rest.remaining > 0 ? <RestPanel remaining={rest.remaining} total={rest.total} sound={rest.sound} onToggleSound={rest.toggleSound}
            flashing={rest.flashing} onExtend={rest.extend} onSkip={rest.skip} /> : <>
            {v6 ? <details className="glass rounded-card p-4"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{v6t('controls')}</summary><SetControls state={state} /></details> : <SetControls state={state} />}
          </>}
          {lastSet && <FormCheckButton exerciseId={lastSet.exercise_id} setLogId={lastSet.id} />}
          {state.next && <NextUp exercise={state.next.exercise} />}
        </> : <LoadingState />}
      </>}
    {!state.error && !state.loading && state.day && <CardioCards blocks={state.day.cardio ?? []} />}
    {v6 && state.day && !state.finished && <div className="glass rounded-card border border-line-soft p-4">
      <div className="flex min-h-12 items-center justify-between gap-3"><span className="text-lime">{v6t('workout')}</span>
        <a href="#workout-exercises" className="flex min-h-12 items-center text-muted">{v6t('exercises')}</a>
        <Link href="/player/history" className="flex min-h-12 items-center text-muted">{v6t('history')}</Link></div>
      <details id="workout-exercises"><summary className="flex min-h-12 cursor-pointer items-center text-sm">{v6t('exercises')}</summary>
        <ol className="divide-y divide-line-soft">{state.day.exercises.map(exercise => <li key={exercise.id} className="py-4 text-sm"><bdi>{exercise.name_en}</bdi>
          {exercise.notes && <p className="mt-1 text-xs text-muted">{exercise.notes}</p>}</li>)}</ol>
      </details>
    </div>}
  </main>;
}
