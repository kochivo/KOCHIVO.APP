'use client';

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

export function FocusScreen({ dayId, playerId }: { dayId: string; playerId?: string }) {
  const router = useRouter();
  const [today, setToday] = useState('');
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => { setToday(localDate(new Date())); setOnline(navigator.onLine); };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useWakeLock();
  const state = useFocusSession(dayId, today, playerId);
  const { current, rest } = state;
  return <main dir="rtl" className="mx-auto max-w-lg space-y-4 px-5 py-6">
    <header className="flex flex-wrap items-center gap-3">
      <IconButton aria-label="رجوع" onClick={() => router.push('/player')}><ArrowRight aria-hidden /></IconButton>
      <h2 className="flex-1 font-bold">{state.day?.title ?? 'التمرين'}</h2>
      <SyncPill state={!online ? 'offline' : state.pending === undefined || state.pending > 0 ? 'pending' : 'synced'} pending={state.pending} />
    </header>
    {state.error ? <ErrorState message={state.error} retryLabel="جرّب تاني" onRetry={state.retry} /> :
      state.loading ? <LoadingState /> : !state.day ? <>
        <EmptyState icon={Dumbbell} title="التمرين ده مش في برنامجك" body="ارجع للرئيسية وشوف تمرينك الحالي" />
        <Link href="/player" className="glass flex min-h-12 items-center justify-center rounded-control px-4">ارجع للرئيسية</Link>
      </> : state.queue.length === 0 ? <EmptyState icon={Dumbbell} title="مفيش تمارين لليوم ده" body="الكابتن لسه بيجهز تمرينك" /> : <>
        <p className="text-sm text-muted">سِت {state.progress} من {state.queue.length}</p>
        <ProgressBar value={state.doneSets.length} max={state.queue.length} aria-label={`سِت ${state.progress} من ${state.queue.length}`} />
        {state.finished ? <DonePanel /> : current ? <>
          <ExerciseHeader exercise={current.exercise} performance={state.performance} />
          <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets}
            onEdit={state.edit} disabled={state.disabled} />
          {rest.remaining > 0 ? <RestPanel remaining={rest.remaining} flashing={rest.flashing} onExtend={rest.extend} onSkip={rest.skip} /> : <>
            <Stepper label="الوزن كجم" value={state.weight} step={2.5} min={0} onChange={state.setWeight} />
            <Stepper label="العدّات" value={state.reps} step={1} min={0} onChange={state.setReps} />
            <Button size="xl" className="w-full" disabled={state.disabled} onClick={() => void state.complete()}>
              <Check aria-hidden />تمّ السِت
            </Button>
          </>}
          {state.next && <NextUp exercise={state.next.exercise} />}
        </> : <LoadingState />}
      </>}
  </main>;
}
