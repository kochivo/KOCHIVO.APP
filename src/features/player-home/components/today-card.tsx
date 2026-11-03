'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { SnapshotDay } from '@/core/offline';
import { GlassCard } from '@/ui';

export function estimateMinutes(exercises: { sets: number; rest_seconds: number }[]): number {
  return Math.round(exercises.reduce((total, exercise) => total + exercise.sets * (40 + exercise.rest_seconds), 0) / 60 / 5) * 5;
}

export function TodayCard({ day, rest }: { day: SnapshotDay; rest: boolean }) {
  const sets = day.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  return <GlassCard level="strong" className="space-y-5 p-5">
    <div className="space-y-2">
      <p className="text-xs text-lime">اليوم {day.position} · تمرين النهارده</p>
      <h2 className="text-3xl font-extrabold">{rest ? 'النهارده راحة' : day.title}</h2>
      {rest && <p className="text-muted">{day.title}</p>}
      <p className="text-sm text-muted">{day.exercises.length} تمارين · {sets} سِت · حوالي {estimateMinutes(day.exercises)} دقيقة</p>
    </div>
    {day.exercises.length === 0 && <p className="text-sm text-muted">الكابتن لسه بيجهز تمارين اليوم.</p>}
    <Link href={`/player/workout/${day.id}`} className={rest ?
      'flex min-h-12 items-center justify-center rounded-control border border-line px-4 font-bold text-muted hover:text-ink' :
      'workout-go flex min-h-20 items-center justify-center gap-3 rounded-card bg-lime px-4 text-xl font-extrabold text-on-lime'}>
      {!rest && <Play aria-hidden className="size-6 fill-current" />}{rest ? 'تمرّن برضه' : 'ابدأ التمرين'}
    </Link>
    <style jsx>{`
      :global(.workout-go) { box-shadow: 0 0 0 6px var(--color-lime-soft), 0 18px 44px -8px var(--color-lime); animation: workout-glow 2.4s ease-in-out infinite; }
      @keyframes workout-glow { 50% { box-shadow: 0 0 0 10px var(--color-lime-soft), 0 18px 54px -6px var(--color-lime); } }
      @media (prefers-reduced-motion: reduce) { :global(.workout-go) { animation: none; } }
    `}</style>
  </GlassCard>;
}
