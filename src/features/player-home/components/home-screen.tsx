'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dumbbell } from 'lucide-react';
import { localDb, parkedCount, retryParked, pendingCount, useLiveQuery } from '@/core/offline';
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
import { TodayCard, estimateMinutes, warmupDuration } from './today-card';
import { NutritionSlot } from './nutrition-slot';
import { WeeklyRestCard } from './weekly-rest-card';
import type { Decision } from '@/features/readiness';
import { usePlayerWeight } from '../hooks/use-player-weight';
import { isRestDay } from '../rest-day';
import { starterText } from '@/lib/starter-text';
import { previewFor } from '../day-preview';
import { DayPreviewCard } from './day-preview-card';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { MorningRow } from './morning-row';
import { CycleEntry } from './cycle-entry';

const readPending = () => pendingCount(localDb());
const RamadanSlot = dynamic(() => import('./ramadan-slot').then(m => m.RamadanSlot));
const readParked = () => parkedCount(localDb());
const readSessions = () => localDb().workout_sessions.toArray();
const PlayerReadiness = dynamic(() => import('@/features/readiness').then(module => module.PlayerReadiness), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});
const V3Home = dynamic(() => import('./v3-home').then(module => module.V3Home), {
  loading: () => <LoadingState variant="cards" />,
});
const PendingForms = dynamic(() => import('@/features/player-shell').then(module => module.PlayerAssessments), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});

export function HomeScreen({ firstName, playerId }: { firstName?: string; playerId?: string }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  const { now, online } = useCalendarClock();
  const [localError, setLocalError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const onError = useCallback(() => setLocalError(true), []);
  const { snapshot, status, retry } = useProgramSnapshot(playerId, retryKey);
  const weightKg = usePlayerWeight(playerId);
  const pending = useLiveQuery(readPending, onError, retryKey);
  const parked = useLiveQuery(readParked, onError, retryKey);
  const allSessions = useLiveQuery(readSessions, onError, retryKey);
  const sessions = allSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id));
  const today = now ? localDate(now, timezone) : '';
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
  const preview = snapshot && today ? v6 && rest && selectedDate === localDate(tomorrowAt, 'UTC')
    ? { day: tomorrow, status: tomorrowRest || tomorrow?.is_rest_day || (weekly && !tomorrow) ? 'rest' as const : 'upcoming' as const }
    : previewFor(snapshot, sessions ?? [], selectedDate, today) : { day: undefined, status: 'rest' as const };
  const statusHeader = <header className="flex flex-wrap items-center justify-between gap-stack">
      {now && <Greeting firstName={firstName} now={now} playerId={playerId} snapshot={snapshot} loading={status === 'loading'} />}
      {ranksEnabled() && <RankChip />}
      <SyncPill state={!online ? 'offline' : parked && parked > 0 ? 'attention' : pending === undefined || pending > 0 ? 'pending' : 'synced'} pending={pending}
        onRetry={() => { void retryParked(localDb()).catch(onError); }} />
    </header>;
  return <main data-mood={rest ? 'rest' : undefined} data-tour-ready={Boolean(now && status !== 'loading' && (!snapshot || (sessions && weekSessions)))}
    className={v6 ? 'mx-auto flex max-w-lg flex-col gap-stack bg-bg px-page-x pt-card pb-[104px] [font-family:var(--font-alexandria),var(--font-manrope),sans-serif]' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {!v6 && statusHeader}
    {today && <CycleEntry playerId={playerId} today={today} />}
    {now && <RamadanSlot now={now} playerId={playerId} duration={day ? estimateMinutes(day.exercises) + warmupDuration(day) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0) : undefined} />}
    {failed && (!snapshot || localError) ? <ErrorState message={t('couldntLoadYourProgram')} retryLabel={t('tryAgain')} onRetry={() => {
      setLocalError(false); setRetryKey((value) => value + 1); void retry();
    }} /> : !now || status === 'loading' || (snapshot && (!sessions || !weekSessions)) ? <LoadingState variant="cards" /> : <>
      {v6 && <>
        <V3Home weightKg={weightKg} now={now} today={today} firstName={firstName} playerId={playerId} snapshot={snapshot} day={day}
          rest={rest} sessions={sessions ?? []} weekSessions={weekSessions ?? []} onPreview={date => setSelection({ today, date })} />
        <p className="mt-section text-row text-muted">{t('homeMore')}</p>
        {statusHeader}
      </>}
      <div hidden={selectedDate !== today} className="space-y-card-gap">
      {v6 ? <>
        <NextTaskSlot rest={rest} snapshot={snapshot ?? null} sessions={sessions ?? []} today={today} playerId={playerId}
          retryKey={retryKey} onRetry={() => setRetryKey(value => value + 1)} />
        <MorningRow><PlayerReadiness weightKg={weightKg} playerId={playerId} today={today} rest={rest} coachRest={decision === 'rest'}
          onDecisionChange={setDecision} tomorrowRest={Boolean(tomorrowRest)}
          tomorrow={tomorrow && !tomorrowRest && !tomorrow.is_rest_day ? starterText(tomorrow.title, locale) : undefined} /></MorningRow>
      </> : rest ? <PlayerReadiness weightKg={weightKg} playerId={playerId} today={today} rest coachRest={decision === 'rest'}
        onDecisionChange={setDecision}
        tomorrowRest={Boolean(tomorrowRest)}
        tomorrow={tomorrow && !tomorrowRest && !tomorrow.is_rest_day ? starterText(tomorrow.title, locale) : undefined} /> : <>
      <NextTaskSlot snapshot={snapshot ?? null} sessions={sessions ?? []} today={today} playerId={playerId}
        retryKey={retryKey} onRetry={() => setRetryKey(value => value + 1)} />
      <PlayerReadiness weightKg={weightKg} playerId={playerId} today={today} rest={false} onDecisionChange={setDecision} />
      </>}
      </div>
      <WeekStrip today={today} selected={selectedDate} nextDays={buildWeek(localDate(nextWeekAt, 'UTC'), snapshot?.training_days ?? [], [], locale, snapshot ?? undefined)} onSelect={date => setSelection({ today, date })} days={buildWeek(today, snapshot?.training_days ?? [],
        weekSessions?.filter((session) => snapshot?.days.some((day) => day.id === session.program_day_id)) ?? [], locale, snapshot ?? undefined)} />
      <div id="home-day-preview" key={selectedDate} className={selectedDate !== today ? 'motion-safe:animate-[surface-in_180ms_ease-out] motion-reduce:animate-none' : undefined}>
      {selectedDate !== today ? <DayPreviewCard date={selectedDate} {...preview} /> :
        snapshot && weekly && (!day || day.is_rest_day) ? <WeeklyRestCard snapshot={snapshot} today={today} /> :
        snapshot && day ? <TodayCard day={day} rest={Boolean(rest)} /> :
        <EmptyState icon={Dumbbell} title={t('yourProgramIsBeingPrepared')} body={t('yourCoachIsPreparingYourProgramIt')} secondary={{ label: t('messageCoach'), href: '/player/captain' }} />}
      </div>
      {failed && snapshot && <p className="text-sm text-muted">{t('lastUpdatedAWhileAgo')}</p>}
    </>}
    {captainWorkspaceEnabled() && <PendingForms layout="home" />}
    <NutritionSlot date={selectedDate || undefined} />
  </main>;
}
