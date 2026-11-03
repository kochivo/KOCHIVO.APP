'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { SnapshotDay } from '@/core/offline';
import { GlassCard } from '@/ui';
import { starterText } from '@/lib/starter-text';

export function estimateMinutes(exercises: { sets: number; rest_seconds: number }[]): number {
  return Math.round(exercises.reduce((total, exercise) => total + exercise.sets * (40 + exercise.rest_seconds), 0) / 60 / 5) * 5;
}

export function TodayCard({ day, rest }: { day: SnapshotDay; rest: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const minutes = estimateMinutes(day.exercises);
  const sets = day.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  return <GlassCard level="strong" className="space-y-5 p-5">
    <div className="space-y-2">
      <p className="text-xs text-lime">{t('dayHeading', { position: formatNumber(day.position, locale) })}</p>
      <h2 className="text-3xl font-extrabold">{rest ? t('restDay') : starterText(day.title, locale)}</h2>
      {rest && <p className="text-muted">{starterText(day.title, locale)}</p>}
      <p className="text-sm text-muted">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })} · {t('setCount', { n: sets, count: formatNumber(sets, locale) })} · {t('minuteCount', { n: minutes, count: formatNumber(minutes, locale) })}</p>
    </div>
    {day.exercises.length === 0 && <p className="text-sm text-muted">{t('yourCoachIsPreparingTodaysExercises')}</p>}
    <Link href={`/player/workout/${day.id}`} className={rest ?
      'flex min-h-12 items-center justify-center rounded-control border border-line px-4 font-bold text-muted hover:text-ink' :
      'workout-go flex min-h-20 items-center justify-center gap-3 rounded-card bg-lime px-4 text-xl font-extrabold text-on-lime'}>
      {!rest && <Play aria-hidden className="size-6 fill-current" />}{rest ? t('trainAnyway') : t('startWorkout')}
    </Link>
    <style jsx>{`
      :global(.workout-go) { box-shadow: 0 0 0 6px var(--color-lime-soft), 0 18px 44px -8px var(--color-lime); animation: workout-glow 2.4s ease-in-out infinite; }
      @keyframes workout-glow { 50% { box-shadow: 0 0 0 10px var(--color-lime-soft), 0 18px 54px -6px var(--color-lime); } }
      @media (prefers-reduced-motion: reduce) { :global(.workout-go) { animation: none; } }
    `}</style>
  </GlassCard>;
}
