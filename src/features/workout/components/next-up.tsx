'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import type { SnapshotExercise } from '@/core/offline';

export function NextUp({ exercise }: { exercise: SnapshotExercise }) {
  const t = useT(messages);
  const locale = useLocale();
  return <aside className="glass-strong flex flex-wrap items-center justify-between gap-2 rounded-card p-4">
    <span className="text-xs text-muted">{t('upNext')}</span>
    <span className="font-bold"><bdi>{exerciseName(exercise, locale)}</bdi> · <bdi>{formatNumber(exercise.sets, locale)} × {formatNumber(exercise.reps_min ?? 0, locale)}{exercise.reps_max !== null && exercise.reps_max !== exercise.reps_min ? `–${formatNumber(exercise.reps_max, locale)}` : ''}</bdi></span>
  </aside>;
}
