'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import Image from 'next/image';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import type { Performance } from '../data/last-performance';

export function ExerciseHeader({ exercise, performance }: { exercise: SnapshotExercise; performance: Performance | null | undefined }) {
  const t = useT(messages);
  const locale = useLocale();
  const name = exerciseName(exercise, locale);
  return <section className="glass-strong flex items-center gap-4 rounded-card p-4">
    {exercise.media_path && <figure className="shrink-0 text-center">
      <Image src={exerciseMediaUrl(exercise.media_path)} alt={name} width={84} height={84}
        unoptimized className="rounded-control motion-reduce:hidden" />
      <figcaption className="mt-1 text-xs text-muted">{t('gymVisual')}</figcaption>
    </figure>}
    <div className="space-y-2">
      <h1 className="text-2xl font-extrabold"><bdi>{name}</bdi></h1>
      {performance && <p className="text-sm text-muted">{t('lastWeek')} <bdi>{formatNumber(performance.weight_kg ?? 0, locale)} × {formatNumber(performance.reps ?? 0, locale)}</bdi></p>}
    </div>
  </section>;
}
