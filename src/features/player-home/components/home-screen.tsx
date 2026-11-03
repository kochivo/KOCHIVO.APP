'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { localDb, pendingCount, useLiveQuery } from '@/core/offline';
import { localDate } from '@/lib/dates';
import { EmptyState, ErrorState, LoadingState, SyncPill } from '@/ui';
import { useProgramSnapshot } from '../hooks/use-program-snapshot';
import { useWeekSessions } from '../hooks/use-week-sessions';
import { pickTodayDay } from '../next-day';
import { buildWeek } from '../week';
import { Greeting } from './greeting';
import { WeekStrip } from './week-strip';
import { NextTaskSlot } from './next-task-slot';
import { TodayCard } from './today-card';
import { NutritionSlot } from './nutrition-slot';

const readPending = () => pendingCount(localDb());
const readSessions = () => localDb().workout_sessions.toArray();

export function HomeScreen({ firstName, playerId }: { firstName?: string; playerId?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const [now, setNow] = useState<Date>();
  const [online, setOnline] = useState(true);
  const [localError, setLocalError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setLocalError(true), []);
  const { snapshot, status, retry } = useProgramSnapshot(playerId, retryKey);
  const pending = useLiveQuery(readPending, onError, retryKey);
  const allSessions = useLiveQuery(readSessions, onError, retryKey);
  const sessions = allSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id));
  const today = now ? localDate(now) : '';
  const weekSessions = useWeekSessions(today || '2000-01-01', onError, retryKey);
  useEffect(() => {
    const update = () => { setNow(new Date()); setOnline(navigator.onLine); };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const day = snapshot && sessions && today ? pickTodayDay(snapshot, sessions, today) : undefined;
  const rest = snapshot && now && snapshot.training_days.length > 0 &&
    !snapshot.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()) &&
    !sessions?.some((session) => session.training_date === today);
  const failed = localError || status === 'error';
  return <main className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header className="flex flex-wrap items-center justify-between gap-3">
      {now && <Greeting firstName={firstName} now={now} />}
      <SyncPill state={!online ? 'offline' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} />
    </header>
    {failed && (!snapshot || localError) ? <ErrorState message={t('couldntLoadYourProgram')} retryLabel={t('tryAgain')} onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1); void retry();
    }} /> : !now || status === 'loading' || (snapshot && (!sessions || !weekSessions)) ? <LoadingState /> : <>
      <NextTaskSlot snapshot={snapshot ?? null} sessions={sessions ?? []} today={today} playerId={playerId}
        retryKey={retryKey} onRetry={() => setRetryKey(value => value + 1)} />
      <WeekStrip today={today} days={buildWeek(today, snapshot?.training_days ?? [],
        weekSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id)) ?? [], locale)} />
      {snapshot && day ? <TodayCard day={day} rest={Boolean(rest)} /> :
        <EmptyState icon={Dumbbell} title={t('yourProgramIsBeingPrepared')} body={t('yourCoachIsPreparingYourProgramIt')} />}
      {failed && snapshot && <p className="text-sm text-muted">{t('lastUpdatedAWhileAgo')}</p>}
    </>}
    <NutritionSlot />
  </main>;
}
