'use client';
import { useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { ErrorState, LoadingState, SyncPill } from '@/ui';
import { CardioCards } from '@/ui/cardio-cards';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { KoPlay } from '@/ui/icons';
import type { WorkoutPointsInput } from '@/features/ranks';
import type { useFocusSession } from '../hooks/use-focus-session';
import type { useWarmupSession } from '../hooks/use-warmup-session';
import { restAnnouncement } from '../rest';
import { messages } from '../messages';
import { WorkoutOverview } from './workout-overview';
import { WorkoutSet } from './workout-set';
const WorkoutRest = dynamic(() => import('./workout-rest').then(module => module.WorkoutRest), { ssr: false, loading: () => <LoadingState /> });
import { PainButton } from './pain-button';
import { WorkoutClock } from './workout-clock';
import { MediaStatus } from './media-status';
import { DonePanel } from './done-panel';
import { WarmupNav } from './warmup-nav';
import { CycleEntry } from '@/features/player-home';

const SessionFeedback = dynamic(() => import('./session-feedback').then(module => module.SessionFeedback), { ssr: false, loading: () => <LoadingState /> });
const PrBurst = dynamic(() => import('./pr-burst').then(module => module.PrBurst), { ssr: false });
const CoachReductionBanner = dynamic(() => import('@/features/readiness').then(module => module.CoachReductionBanner), { ssr: false });

export function PlayerWorkoutV3({ state, progress, workout, online, playerId, onBack }: {
  state: ReturnType<typeof useFocusSession>; progress: ReturnType<typeof useWarmupSession>;
  workout?: WorkoutPointsInput; online: boolean; playerId?: string; onBack?: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const Container = onBack ? 'div' : 'main';
  const back = onBack ?? (() => router.push('/player'));
  const [started, setStarted] = useState<boolean | null>(null);
  const [startedAt, setStartedAt] = useState<string | undefined>(state.session?.started_at);
  const container = useRef<HTMLElement | null>(null);
  const inFocus = started ?? state.doneSets.length > 0;
  if (!state.day) return null;
  const waitingForExercise = state.painSkipped > 0 && !state.current;
  const overview = !inFocus && !state.finished && !state.loading && !state.error && !waitingForExercise;
  const hasWarmup = Boolean(state.day.warmup?.items.length);
  const index = state.day.exercises.findIndex(exercise => exercise.id === state.current?.exercise.id);
  function start() {
    if (hasWarmup && progress.pending) progress.skip();
    setStartedAt(previous => previous ?? state.session?.started_at ?? new Date().toISOString());
    setStarted(true);
    container.current?.scrollIntoView({ block: 'start' });
  }
  return <Container ref={element => { container.current = element; }} style={{ fontFamily: 'var(--font-alexandria), var(--font-manrope), sans-serif' }}
    className={`mx-auto flex w-full max-w-lg flex-col gap-card-gap pt-[max(var(--spacing-stack),var(--workout-safe-top,var(--safe-top)))] ${overview ? '' : 'pb-[max(var(--spacing-section),var(--safe-bottom))]'}`}>
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{restAnnouncement(state.rest.remaining, state.rest.endsAt !== null, t)}</p>
    <CycleEntry playerId={playerId} workout />
    {state.pr && <PrBurst key={state.pr.id} pr={state.pr} onDismiss={state.dismissPr} />}
    {state.error ? <ErrorState message={state.error} retryLabel={t('tryAgain')} onRetry={state.retry} /> : state.loading ? <LoadingState /> :
      state.finished ? state.session ? <SessionFeedback key={state.session.id} sessionId={state.session.id} workout={workout}
      hasFeedback={state.session.session_rpe != null || Boolean(state.session.player_note)} onSavedHome={back} onBack={onBack} /> : <DonePanel workout={workout} onBack={onBack} /> :
      waitingForExercise ? <LoadingState /> : inFocus ?
      state.rest.remaining > 0 ? <WorkoutRest state={state} onBack={() => setStarted(false)} /> : <>
      <header className="flex items-center gap-stack">
        <IconButton aria-label={t('v3Close')} onClick={() => setStarted(false)}><ChevronRight aria-hidden className="dir-icon size-5" /></IconButton>
        <div className="min-w-0 flex-1 space-y-inline">
          <div aria-hidden className="flex gap-inline">{state.day.exercises.map((exercise, position) =>
            <span key={exercise.id} className={`h-1 min-w-0 flex-1 rounded-full ${position < index ? 'bg-lime' :
              position === index ? 'bg-lime/60' : 'bg-line'}`} />)}
          </div>
          <div className="flex flex-wrap items-center gap-x-inline text-micro text-muted">
            <span>{t('v3ExerciseProgress', { current: formatNumber(index + 1, locale), total: formatNumber(state.day.exercises.length, locale) })}</span>
            <WorkoutClock startedAt={startedAt ?? state.session?.started_at} quiet />
          </div>
        </div>
        <PainButton state={state} v4 />
      </header>
      <WorkoutSet state={state} v4 />
    </> : <WorkoutOverview state={state} progress={progress} playerId={playerId} onBack={back} />}
    {state.decision === 'reduce' && <CoachReductionBanner />}
    {!state.loading && !state.error && <CardioCards blocks={state.day.cardio ?? []} />}
    <div className="flex flex-wrap items-center gap-stack">
      <SyncPill state={!online ? 'offline' : state.parked && state.parked > 0 ? 'attention' : state.pending === undefined || state.pending > 0 ? 'pending' : 'synced'} pending={state.pending} onRetry={state.retrySync} />
      <MediaStatus />
      {!inFocus && <Link href="/player/history" className="flex min-h-12 items-center text-sm text-muted underline">{t('seeHistory')}</Link>}
    </div>
    {overview && hasWarmup && <WarmupNav />}
    {overview && <div data-action-bar className="sticky bottom-0 z-20 border-t border-line-soft bg-bg pt-stack pb-[max(var(--spacing-stack),var(--safe-bottom))]">
      <Button size="lg" block onClick={start} disabled={hasWarmup && (progress.loading || progress.error)}>
        <KoPlay aria-hidden className="size-5 shrink-0 text-current! [&_*]:text-current!" />{t(startedAt || state.session || state.doneSets.length ? 'continueWorkout' : 'v3Start')}
      </Button>
    </div>}
  </Container>;
}
