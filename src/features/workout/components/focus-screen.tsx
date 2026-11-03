'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Dumbbell } from 'lucide-react';
import { localDate } from '@/lib/dates';
import { Button, EmptyState, ErrorState, IconButton, LoadingState, ProgressBar, Stepper, SyncPill } from '@/ui';
import { useFocusSession } from '../hooks/use-focus-session';
import { useWakeLock } from '../hooks/use-wake-lock';
import { DonePanel } from './done-panel';
import { ExerciseHeader } from './exercise-header';
import { NextUp } from './next-up';
import { RestPanel } from './rest-panel';
import { SetDots } from './set-dots';
import { PrBurst } from './pr-burst';
import { FormCheckButton } from './form-check-button';
import { MediaStatus } from './media-status';
import { restAnnouncement } from '../rest';

export function FocusScreen({ dayId, playerId }: { dayId: string; playerId?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [today, setToday] = useState('');
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => { setToday(localDate(new Date())); setOnline(navigator.onLine); };
    const resume = () => { if (document.visibilityState === 'visible') update(); };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  useWakeLock();
  const state = useFocusSession(dayId, today, playerId);
  const { current, rest } = state;
  const lastSet = state.doneSets.filter((row) => row.program_exercise_id === current?.exercise.id)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  return <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{restAnnouncement(rest.remaining, rest.endsAt !== null, t)}</p>
    {state.pr && <PrBurst key={state.pr.id} pr={state.pr} onDismiss={state.dismissPr} />}
    <header className="flex flex-wrap items-center gap-3">
      <IconButton aria-label={t('back')} onClick={() => router.push('/player')}><ArrowRight aria-hidden className="dir-icon" /></IconButton>
      <p className="flex-1 font-bold">{state.day?.title ?? t('workout')}</p>
      <SyncPill state={!online ? 'offline' : state.pending === undefined || state.pending > 0 ? 'pending' : 'synced'} pending={state.pending} />
      <MediaStatus />
    </header>
    {state.error ? <ErrorState message={state.error} retryLabel={t('tryAgain')} onRetry={state.retry} /> :
      state.loading ? <LoadingState /> : !state.day ? <>
        <EmptyState icon={Dumbbell} title={t('thisWorkoutIsntInYourProgram')} body={t('goHomeToSeeYourCurrentWorkout')} />
        <Link href="/player" className="glass flex min-h-12 items-center justify-center rounded-control px-4">{t('backToHome')}</Link>
      </> : state.queue.length === 0 ? <EmptyState icon={Dumbbell} title={t('noExercisesForThisDay')} body={t('yourCoachIsPreparingYourWorkout')} /> : <>
        <p className="text-sm text-muted">{t('setProgress', { value0: formatNumber(state.progress, locale), value1: formatNumber(state.queue.length, locale) })}</p>
        <ProgressBar value={state.doneSets.length} max={state.queue.length} aria-label={t('setProgress', { value0: formatNumber(state.progress, locale), value1: formatNumber(state.queue.length, locale) })} />
        {state.finished ? <DonePanel /> : current ? <>
          <ExerciseHeader exercise={current.exercise} performance={state.performance} />
          <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets}
            onEdit={state.edit} disabled={state.disabled} />
          {rest.remaining > 0 ? <RestPanel remaining={rest.remaining} flashing={rest.flashing} onExtend={rest.extend} onSkip={rest.skip} /> : <>
            <Stepper format={(value) => formatNumber(value, locale)} label={t('weightKg')} value={state.weight} step={2.5} min={0} onChange={state.setWeight} />
            <Stepper format={(value) => formatNumber(value, locale)} label={t('reps')} value={state.reps} step={1} min={0} onChange={state.setReps} />
            <Button size="xl" className="w-full" disabled={state.disabled} onClick={() => void state.complete()}>
              <Check aria-hidden />{t('completeSet')}
            </Button>
          </>}
          {lastSet && <FormCheckButton exerciseId={lastSet.exercise_id} setLogId={lastSet.id} />}
          {state.next && <NextUp exercise={state.next.exercise} />}
        </> : <LoadingState />}
      </>}
  </main>;
}
