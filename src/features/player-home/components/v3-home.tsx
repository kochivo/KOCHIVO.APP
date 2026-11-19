'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import type { ProgramSnapshot, SnapshotDay, WorkoutSessionRow } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { formatNumber } from '@/lib/format';
import { useStreakSessions } from '../hooks/use-streak-sessions';
import { computeStreak, shiftDate, trainingDay } from '../streak';
import { isWeeklyProgram, pickTodayDay } from '../next-day';
import { isRestDay } from '../rest-day';
import { messages } from '../messages';
import { messages as copy } from '../v4/messages';
import { HomeHeader } from './home-header';
import { HomeHero } from './home-hero';
import { HomeTiles } from './home-tiles';
import { TomorrowCard } from './tomorrow-card';
import { CaptainRow } from './captain-row';
import { buttonClass } from '@/ui/button';
import { HomeRankCard } from './home-rank-card';

const StreakSheet = dynamic(() => import('./streak-sheet').then(module => module.StreakSheet), { ssr: false });

export function V3Home({ weightKg, now, today, firstName, playerId, snapshot, day, rest, nutritionRest = rest, sessions, onPreview, readiness, week, showToday = true }: {
  weightKg?: number; now: Date; today: string; firstName?: string; playerId?: string; snapshot?: ProgramSnapshot | null;
  day?: SnapshotDay; rest: boolean; nutritionRest?: boolean; sessions: WorkoutSessionRow[];
  onPreview: (date: string) => void; readiness?: ReactNode; week?: ReactNode; showToday?: boolean;
}) {
  const t = useT(messages);
  const v4 = useT(copy);
  const locale = useLocale();
  const history = useStreakSessions(today, playerId);
  const [streakOpen, setStreakOpen] = useState(false);
  const trains = (date: string) => trainingDay(date, snapshot?.training_days ?? [], snapshot ?? undefined);
  const stats = history ? computeStreak({ today, ...history, isTrainingDay: trains }) : null;
  const captain = useCaptainContext();
  // The hero must not offer a second start once today's session for this day is finished.
  const session = day && sessions.find(session => session.program_day_id === day.id && session.training_date === today);
  const doneToday = Boolean(session?.completed_at);
  const tomorrow = shiftDate(today, 1);
  const tomorrowDay = snapshot ? pickTodayDay(snapshot, sessions, tomorrow) : undefined;
  const tomorrowRest = Boolean(snapshot && (isRestDay(snapshot, sessions, tomorrow) ||
    (isWeeklyProgram(snapshot) && !tomorrowDay))) || Boolean(tomorrowDay?.is_rest_day);
  const canPreview = Boolean(tomorrowDay && !tomorrowRest);
  const weekStrip = <div data-home-section="week">{week}</div>;
  const rank = <div data-home-section="rank" className="empty:hidden"><HomeRankCard playerId={playerId} /></div>;
  const dailyCheck = <div data-home-section="readiness" className="empty:hidden">{readiness}</div>;
  return <section data-mood={rest ? 'rest' : undefined} className="flex flex-col gap-card-gap">
    <HomeHeader now={now} firstName={firstName} rest={rest} streak={stats && <button id="streak-pill" type="button" onClick={() => setStreakOpen(true)} aria-haspopup="dialog"
      aria-label={t('streakLabel', { count: formatNumber(stats.current, locale), done: formatNumber(stats.weekDone, locale), planned: formatNumber(stats.weekPlanned, locale) })}
      className="press flex min-h-12 shrink-0 items-center gap-inline rounded-control px-inline text-sm font-extrabold tabular-nums">
      <Flame aria-hidden className="size-4 text-warn" />{formatNumber(stats.current, locale)}
    </button>} />
    {streakOpen && stats && history && <StreakSheet stats={stats} today={today} completedDates={history.completedDates}
      isTrainingDay={trains} onClose={() => setStreakOpen(false)} footer={<Link href="/player/history" onClick={() => setStreakOpen(false)}
        className={buttonClass({ variant: 'secondary', block: true })}>{v4('history')}</Link>} />}
    {rest && weekStrip}
    <div hidden={!showToday} className="space-y-card-gap">
    {captain.data?.awaitingPlansAt && <p role="status" className="text-sm text-calm">{t('waitingForPlans')}</p>}
    <div data-home-section="hero" className="empty:hidden"><HomeHero finished={Boolean(snapshot)} day={day}
      rest={rest} doneToday={doneToday} startedToday={Boolean(session)} restAction={<>
        <p className="text-xs text-muted">{v4('stretch')}</p>
        {canPreview && <a href="#home-day-preview" onClick={() => onPreview(tomorrow)}
          className={buttonClass({ variant: 'secondary', block: false, className: 'self-start' })}>{v4('tomorrow')}</a>}
      </>} /></div>
    {!rest && <>{dailyCheck}{rank}</>}
    <div data-home-section="nutrition"><HomeTiles weightKg={weightKg} today={today} playerId={playerId} rest={rest} nutritionRest={nutritionRest} /></div>
    {rest && <>
      <div data-home-section="tomorrow"><TomorrowCard day={tomorrowDay} date={tomorrow} rest={tomorrowRest} onPreview={onPreview} /></div>
      {rank}
      {stats && snapshot && !trains(today) && <p className="ko-strip rounded-card p-card text-xs">{t('homeRestStreak', { count: formatNumber(stats.current, locale) })}</p>}
      {dailyCheck}
    </>}
    </div>
    {!rest && weekStrip}
    {showToday && !rest && <CaptainRow name={captain.data?.fullName} playerId={playerId} captainId={captain.data?.captainId} />}
  </section>;
}
