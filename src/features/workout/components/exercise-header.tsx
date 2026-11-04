'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Image from 'next/image';
import Link from 'next/link';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import type { LastSession } from '../data/last-performance';

export function ExerciseHeader({ exercise, last }: { exercise: SnapshotExercise; last: LastSession | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const name = exerciseName(exercise, locale);
  return <section className="glass-strong flex items-center gap-4 rounded-card p-4">
    {exercise.media_path && <figure className="shrink-0 text-center">
      <Image src={exerciseMediaUrl(exercise.media_path)} alt={name} width={84} height={84}
        unoptimized loading="eager" decoding="async" className="rounded-control motion-reduce:hidden" />
      <figcaption className="mt-1 text-xs text-muted">{t('gymVisual')}</figcaption>
    </figure>}
    <div className="min-w-0 space-y-2">
      <h1 className="text-2xl font-extrabold"><bdi>{name}</bdi></h1>
      {exercise.video_url?.startsWith('https://') && <a href={exercise.video_url} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center text-lime underline">{t('watchVideo')}</a>}
      {last?.sets.length ? <p className="text-sm text-muted">{t('lastTime')} <bdi dir="ltr">{last.sets.map((set) =>
        `${formatNumber(set.weight_kg ?? 0, locale)}×${formatNumber(set.reps ?? 0, locale)}`).join(' · ')}</bdi></p> : null}
      <Link className="inline-flex min-h-12 items-center text-lime underline" href={`/player/history?exercise=${encodeURIComponent(exercise.exercise_id)}`}>
        {t('seeHistory')}
      </Link>
    </div>
  </section>;
}
