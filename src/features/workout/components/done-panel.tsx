'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { nextTier, previewWorkoutPoints, ranksMessages, tierFor } from '@/features/ranks';
import type { WorkoutPointsInput } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import Link from 'next/link';

export function DonePanel({ workout, lifetime }: { workout?: WorkoutPointsInput; lifetime?: number }) {
  const t = useT(messages);
  const rankT = useT(ranksMessages);
  const locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const preview = workout ? previewWorkoutPoints(workout) : undefined;
  // Stars above Legend have their own wording on the rank screen; skip them here.
  const next = lifetime === undefined || tierFor(lifetime) === 'legend' ? undefined : nextTier(lifetime);
  let line: string | undefined;
  if (preview?.counted) {
    line = t('expectedPoints', { n: number(preview.points) });
    if (next && next.needed > 0) line = t('pointsWithNext', { points: line,
      next: rankT('workoutNext', { n: number(next.needed), tier: rankT(next.tier) }) });
  } else if (preview?.reason === 'short') {
    line = t('pointsShort', { n: number(preview.minMinutes) });
  } else if (preview?.reason === 'sets' && workout) {
    line = t('pointsSets', { logged: number(workout.loggedSets), planned: number(workout.plannedSets), min: number(preview.minSets) });
  }
  return <section className="glass-strong space-y-5 rounded-card p-8 text-center">
    <h1 className="text-3xl font-extrabold">{t('workoutComplete')}</h1>
    {line && <p className={preview?.counted ? 'font-bold' : 'text-muted'}>{line}</p>}
    <p className="text-muted">{t('savedOnYourPhoneYourCoachWill')}</p>
    <Link href="/player" className="glass inline-flex min-h-12 items-center rounded-control px-5">{t('backToHome')}</Link>
  </section>;
}
