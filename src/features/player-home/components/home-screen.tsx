'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dumbbell } from 'lucide-react';
import { localDb, pendingCount, useLiveQuery } from '@/core/offline';
import { localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { EmptyState, ErrorState, LoadingState, SyncPill } from '@/ui';
import { useProgramSnapshot } from '../hooks/use-program-snapshot';
import { useWeekSessions } from '../hooks/use-week-sessions';
import { isWeeklyProgram, pickTodayDay } from '../next-day';
import { buildWeek } from '../week';
import { Greeting } from './greeting';
import { RankChip } from '@/features/ranks';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { WeekStrip } from './week-strip';
import { NextTaskSlot } from './next-task-slot';
import { TodayCard } from './today-card';
import { NutritionSlot } from './nutrition-slot';
import { WeeklyRestCard } from './weekly-rest-card';
import type { Decision } from '@/features/readiness';
import { isRestDay } from '../rest-day';
import { starterText } from '@/lib/starter-text';
import { previewFor } from '../day-preview';
import { DayPreviewCard } from './day-preview-card';

const readPending = () => pendingCount(localDb());
const readSessions = () => localDb().workout_sessions.toArray();
const PlayerReadiness = dynamic(() => import('@/features/readiness').then(module => module.PlayerReadiness), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});

export function HomeScreen({ firstName, playerId }: { firstName?: string; playerId?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const { now, online } = useCalendarClock();
  const [localError, setLocalError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setLocalError(true), []);
  const { snapshot, status, retry } = useProgramSnapshot(playerId, retryKey);
  const pending = useLiveQuery(readPending, onError, retryKey);
  const allSessions = useLiveQuery(readSessions, onError, retryKey);
  const sessions = allSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id));
  const today = now ? localDate(now) : '';
  const [selection, setSelection] = useState({ today, date: today });
  const selectedDate = selection.today === today ? selection.date : today;
  if (selection.today !== today) setSelection({ today, date: today });
  const weekSessions = useWeekSessions(today || '2000-01-01', onError, retryKey);
  const day = snapshot && sessions && today ? pickTodayDay(snapshot, sessions, today) : undefined;
  const weekly = snapshot ? isWeeklyProgram(snapshot) : false;
  const [decision, setDecision] = useState<Decision | null>(null);
  const rest = decision === 'rest' || Boolean(snapshot && sessions && today && isRestDay(snapshot, sessions, today));
  const tomorrowAt = new Date(`${today || '2000-01-01'}T12:00:00Z`);
  tomorrowAt.setUTCDate(tomorrowAt.getUTCDate() + 1);
  const tomorrow = snapshot && sessions ? pickTodayDay(snapshot, sessions, localDate(tomorrowAt, 'UTC')) : undefined;
  const tomorrowRest = snapshot && sessions ? isRestDay(snapshot, sessions, localDate(tomorrowAt, 'UTC')) : false;
  const failed = localError || status === 'error';
  const nextWeekAt = new Date(`${today || '2000-01-01'}T12:00:00Z`);
  nextWeekAt.setUTCDate(nextWeekAt.getUTCDate() + 7);
  return <main data-mood={rest ? 'rest' : undefined} data-tour-ready={Boolean(now && status !== 'loading' && (!snapshot || (sessions && weekSessions)))} className="mx-auto max-w-lg space-y-4 px-5 pt-6 pb-32">
    <header className="flex flex-wrap items-center justify-between gap-3">
      {now && <Greeting firstName={firstName} now={now} playerId={playerId} snapshot={snapshot} loading={status === 'loading'} />}
      {ranksEnabled() && <RankChip />}
      <SyncPill state={!online ? 'offline' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending} />
    </header>
    {failed && (!snapshot || localError) ? <ErrorState message={t('couldntLoadYourProgram')} retryLabel={t('tryAgain')} onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1); void retry();
    }} /> : !now || status === 'loading' || (snapshot && (!sessions || !weekSessions)) ? <LoadingState variant="cards" /> : <>
      <div hidden={selectedDate !== today} className="space-y-4">
      {rest ? <PlayerReadiness playerId={playerId} today={today} rest coachRest={decision === 'rest'}
        onDecisionChange={setDecision}
        tomorrowRest={Boolean(tomorrowRest)}
        tomorrow={tomorrow && !tomorrowRest && !tomorrow.is_rest_day ? starterText(tomorrow.title, locale) : undefined} /> : <>
      <NextTaskSlot snapshot={snapshot ?? null} sessions={sessions ?? []} today={today} playerId={playerId}
        retryKey={retryKey} onRetry={() => setRetryKey(value => value + 1)} />
      <PlayerReadiness playerId={playerId} today={today} rest={false} onDecisionChange={setDecision} />
      </>}
      </div>
      <WeekStrip today={today} selected={selectedDate} nextDays={buildWeek(localDate(nextWeekAt, 'UTC'), snapshot?.training_days ?? [], [], locale, snapshot ?? undefined)} onSelect={date => setSelection({ today, date })} days={buildWeek(today, snapshot?.training_days ?? [],
        weekSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id)) ?? [], locale, snapshot ?? undefined)} />
      <div key={selectedDate} className={selectedDate !== today ? 'motion-safe:animate-[surface-in_180ms_ease-out] motion-reduce:animate-none' : undefined}>
      {selectedDate !== today ? <DayPreviewCard date={selectedDate} {...(snapshot ? previewFor(snapshot, sessions ?? [], selectedDate, today) : { day: undefined, status: 'rest' as const })} /> :
        snapshot && weekly && (!day || day.is_rest_day) ? <WeeklyRestCard snapshot={snapshot} today={today} /> :
        snapshot && day ? <TodayCard day={day} rest={Boolean(rest)} /> :
        <EmptyState icon={Dumbbell} title={t('yourProgramIsBeingPrepared')} body={t('yourCoachIsPreparingYourProgramIt')} secondary={{ label: t('messageCoach'), href: '/player/captain' }} />}
      </div>
      {failed && snapshot && <p className="text-sm text-muted">{t('lastUpdatedAWhileAgo')}</p>}
    </>}
    <NutritionSlot date={selectedDate || undefined} />
  </main>;
}
