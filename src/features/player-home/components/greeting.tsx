'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { DEFAULT_TIMEZONE, localDate, formatDateAr } from '@/lib/dates';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ProgramSnapshot } from '@/core/offline';
import { useStreakSessions } from '../hooks/use-streak-sessions';
import { computeStreak, trainingDay } from '../streak';
import { StreakPill } from './streak-pill';
import { AvatarRing } from './avatar-ring';

const StreakSheet = dynamic(() => import('./streak-sheet').then(module => module.StreakSheet), { ssr: false });

export function Greeting({ firstName, now, playerId, snapshot, loading = false }: {
  firstName?: string; now: Date; playerId?: string; snapshot?: ProgramSnapshot | null; loading?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: DEFAULT_TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const date = localDate(now);
  const history = useStreakSessions(date, playerId);
  const [open, setOpen] = useState(false);
  const isTrainingDay = (day: string) => trainingDay(day, snapshot?.training_days ?? [], snapshot ?? undefined);
  const stats = history && !loading ? computeStreak({ today: date, ...history, isTrainingDay }) : null;
  const weekday = formatDateAr(date, { weekday: 'long' }, locale);
  const dayMonth = formatDateAr(date, { day: 'numeric', month: 'long' }, locale);
  return <div className="min-w-0 flex-1">
    <div className="flex items-center gap-3">
    {stats && <AvatarRing initial={firstName?.slice(0, 1) || t('streakInitial')} done={stats.weekDone} planned={stats.weekPlanned} />}
    <div className="min-w-0 space-y-1">
    <p className="text-start text-xs text-muted"><bdi>{`${weekday} · ${dayMonth}`}</bdi></p>
    <h1 className="text-2xl font-extrabold">{hour < 12 ? t('goodMorning') : t('goodEvening')}{firstName ? t('namedGreeting', { value0: firstName }) : ''}</h1>
    </div></div>
    {playerId && (history === undefined || loading) ? <div className="flex min-h-12 items-center" role="status" aria-label={t('streakLoading')}><span className="h-[26px] w-56 animate-pulse rounded-full border border-ink/10 bg-ink/5 motion-reduce:animate-none" /></div> :
      stats && <StreakPill stats={stats} onOpen={() => setOpen(true)} />}
    {open && stats && history && <StreakSheet stats={stats} today={date} completedDates={history.completedDates} isTrainingDay={isTrainingDay} onClose={() => setOpen(false)} />}
  </div>;
}
