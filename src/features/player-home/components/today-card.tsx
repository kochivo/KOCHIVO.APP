'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Link from 'next/link';
import type { SnapshotDay } from '@/core/offline';
import { Dumbbell } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { CardioCards } from '@/ui/cardio-cards';
import { starterText } from '@/lib/starter-text';
import { messages as warmupMessages } from '../warmup/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export function estimateMinutes(exercises: { sets: number; rest_seconds: number }[]): number {
  return Math.round(exercises.reduce((total, exercise) => total + exercise.sets * (40 + exercise.rest_seconds), 0) / 60 / 5) * 5;
}

// Keep the synchronous home summary independent of the programs barrel's server actions.
export function warmupDuration(day: SnapshotDay): number {
  return Math.ceil((day.warmup?.items ?? []).reduce((sum, item) => sum +
    (item.unit === 'min' ? item.amount * 60 : item.unit === 'sec' ? item.amount : 0), 0) / 60);
}

export function TodayCard({ day, rest }: { day: SnapshotDay; rest: boolean }) {
  const t = useT(messages);
  const wt = useT(warmupMessages);
  const locale = useLocale();
  const v3 = captainWorkspaceEnabled();
  const resting = rest || Boolean(day.is_rest_day);
  const warmupMinutes = warmupDuration(day);
  const minutes = estimateMinutes(day.exercises) + warmupMinutes + (day.cardio ?? []).reduce((total, block) => total + block.minutes, 0);
  const sets = day.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const contact = { label: t('messageCoach'), href: '/player/captain' };
  const content = <>
    <div className="space-y-2">
      <p className="text-xs text-muted">{day.weekday != null ? t(weekdays[day.weekday] ?? 'sat') : t('dayHeading', { position: formatNumber(day.position, locale) })}</p>
      <h2 className="text-3xl font-extrabold">{resting ? t('restDay') : starterText(day.title, locale) || t('todaysWorkout')}</h2>
      {resting && <p className="text-muted">{t('weeklyRest')}</p>}
      <p className="text-sm text-muted">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })} · {t('setCount', { n: sets, count: formatNumber(sets, locale) })} · {t('minuteCount', { n: minutes, count: formatNumber(minutes, locale) })}</p>
      {!resting && warmupMinutes > 0 && <p className="text-xs text-warn">{wt('time', { minutes: formatNumber(warmupMinutes, locale) })}</p>}
    </div>
    {day.exercises.length === 0 ? !resting && !day.cardio?.length && <EmptyState icon={Dumbbell} title={t('yourProgramIsBeingPrepared')} body={t('yourCoachIsPreparingTodaysExercises')}
      action={v3 ? undefined : contact} secondary={v3 ? contact : undefined} /> :
    <Link data-tour={v3 ? undefined : 'workout-start'} href={`/player/workout/${day.id}`} className="flex min-h-12 items-center justify-center rounded-control border border-line px-4 font-bold text-muted hover:text-ink">
      {resting ? t('trainAnyway') : t('startWorkout')}
    </Link>}
    <CardioCards blocks={day.cardio ?? []} />
  </>;
  return v3 ? <section className="space-y-5 rounded-[24px] border border-line-soft bg-surface p-5">{content}</section>
    : <GlassCard data-tour="player-workout" level="featured" className="space-y-5 p-5">{content}</GlassCard>;
}
