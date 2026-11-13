'use client';

import Link from 'next/link';
import type { ProgramSnapshot, SnapshotDay, WorkoutSessionRow } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { NotificationBell } from '@/features/notifications';
import { KoPlus } from '@/ui/icons/ko-plus';
import { ErrorState, LoadingState } from '@/ui';
import { useStreakSessions } from '../hooks/use-streak-sessions';
import { computeStreak, shiftDate, trainingDay } from '../streak';
import { isWeeklyProgram, pickTodayDay } from '../next-day';
import { isRestDay } from '../rest-day';
import { buildWeek } from '../week';
import { messages } from '../messages';
import { HomeHeader } from './home-header';
import { HomeHero } from './home-hero';
import { HomeTiles } from './home-tiles';
import { TomorrowCard } from './tomorrow-card';
import { CaptainRow } from './captain-row';
import { useHomeVoiceNotes } from './use-home-voice-notes';

export function V3Home({ weightKg, now, today, firstName, playerId, snapshot, day, rest, sessions, weekSessions, onPreview }: {
  weightKg?: number; now: Date; today: string; firstName?: string; playerId?: string; snapshot?: ProgramSnapshot | null;
  day?: SnapshotDay; rest: boolean; sessions: WorkoutSessionRow[]; weekSessions: WorkoutSessionRow[];
  onPreview: (date: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const history = useStreakSessions(today, playerId);
  const trains = (date: string) => trainingDay(date, snapshot?.training_days ?? [], snapshot ?? undefined);
  const stats = history ? computeStreak({ today, ...history, isTrainingDay: trains }) : null;
  const captain = useCaptainContext();
  const voice = useHomeVoiceNotes(playerId);
  const notes = [...voice.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const tomorrow = shiftDate(today, 1);
  const tomorrowDay = snapshot ? pickTodayDay(snapshot, sessions, tomorrow) : undefined;
  const tomorrowRest = Boolean(snapshot && (isRestDay(snapshot, sessions, tomorrow) ||
    (isWeeklyProgram(snapshot) && !tomorrowDay))) || Boolean(tomorrowDay?.is_rest_day);
  const week = buildWeek(today, snapshot?.training_days ?? [],
    weekSessions.filter(session => snapshot?.days.some(day => day.id === session.program_day_id)), locale, snapshot ?? undefined);
  return <section data-mood={rest ? 'rest' : undefined} className="flex flex-col gap-3">
    <HomeHeader now={now} firstName={firstName} bell={<NotificationBell round />} />
    <HomeHero finished={Boolean(snapshot)} day={day} rest={rest} streak={stats && snapshot && !trains(today) ? stats.current : undefined} />
    {rest && <TomorrowCard day={tomorrowDay} date={tomorrow} rest={tomorrowRest} onPreview={onPreview} />}
    <HomeTiles weightKg={weightKg} today={today} playerId={playerId} rest={rest} streak={stats?.current}
      done={week.filter(day => day.state === 'done').length} planned={snapshot ? week.filter(day => trains(day.date)).length : 0}
      onWater={() => onPreview(today)} />
    {rest ? <Link href="/player/nutrition" className="flex h-[62px] items-center justify-center gap-2.5 rounded-full bg-lime text-lg font-black text-on-lime">
      <KoPlus aria-hidden className="size-[22px] text-on-lime! [&_*]:text-on-lime!" />{t('homeLogFood')}
    </Link> : <CaptainRow name={captain.data?.fullName} note={notes[0]} unheard={notes.some(note => !note.listenedAt)} />}
    {voice.status === 'loading' ? <LoadingState variant="detail" /> : voice.status === 'error' &&
      <ErrorState message={t('homeVoiceError')} retryLabel={t('tryAgain')} onRetry={voice.retry} />}
  </section>;
}
