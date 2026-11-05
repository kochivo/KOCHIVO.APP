'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Link from 'next/link';
import type { SnapshotDay } from '@/core/offline';
import { Dumbbell } from 'lucide-react';
import { CardioCards, EmptyState, GlassCard } from '@/ui';
import { starterText } from '@/lib/starter-text';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export function estimateMinutes(exercises: { sets: number; rest_seconds: number }[]): number {
  return Math.round(exercises.reduce((total, exercise) => total + exercise.sets * (40 + exercise.rest_seconds), 0) / 60 / 5) * 5;
}

export function TodayCard({ day, rest }: { day: SnapshotDay; rest: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const resting = rest || Boolean(day.is_rest_day);
  const minutes = estimateMinutes(day.exercises) + (day.cardio ?? []).reduce((total, block) => total + block.minutes, 0);
  const sets = day.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  return <GlassCard data-tour="player-workout" level="featured" className="space-y-5 p-5">
    <div className="space-y-2">
      <p className="text-xs text-muted">{day.weekday != null ? t(weekdays[day.weekday] ?? 'sat') : t('dayHeading', { position: formatNumber(day.position, locale) })}</p>
      <h2 className="text-3xl font-extrabold">{resting ? t('restDay') : starterText(day.title, locale) || t('todaysWorkout')}</h2>
      {resting && <p className="text-muted">{t('weeklyRest')}</p>}
      <p className="text-sm text-muted">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })} · {t('setCount', { n: sets, count: formatNumber(sets, locale) })} · {t('minuteCount', { n: minutes, count: formatNumber(minutes, locale) })}</p>
    </div>
    {day.exercises.length === 0 ? !resting && !day.cardio?.length && <EmptyState icon={Dumbbell} title={t('yourProgramIsBeingPrepared')} body={t('yourCoachIsPreparingTodaysExercises')} action={{ label: t('messageCoach'), href: '/player/captain' }} /> :
    <Link data-tour="workout-start" href={`/player/workout/${day.id}`} className="flex min-h-12 items-center justify-center rounded-control border border-line px-4 font-bold text-muted hover:text-ink">
      {resting ? t('trainAnyway') : t('startWorkout')}
    </Link>}
    <CardioCards blocks={day.cardio ?? []} />
  </GlassCard>;
}
