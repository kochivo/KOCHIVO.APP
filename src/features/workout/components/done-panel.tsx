'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { nextMedalRank, previewWorkoutPoints, ranksMessages, medalRank } from '@/features/ranks';
import type { WorkoutPointsInput } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { useSyncExternalStore } from 'react';
import { messages } from '../messages';
import { messages as painMessages } from '../pain/messages';
import { painFinishHeadline, readPainSkipCount } from '../pain-stop';

import Link from 'next/link';
import { Button, buttonClass } from '@/ui/button';

const noSubscribe = () => () => {};

export function DonePanel({ workout, lifetime, sessionId, onBack }: { workout?: WorkoutPointsInput; lifetime?: number; sessionId?: string; onBack?: () => void }) {
  const t = useT(messages);
  const pt = useT(painMessages);
  // localStorage is browser-only; the server snapshot keeps hydration on the normal headline.
  const painSkipped = useSyncExternalStore(noSubscribe,
    () => sessionId ? readPainSkipCount(window.localStorage, sessionId) : 0, () => 0);
  const painHeadline = painFinishHeadline(painSkipped, workout?.loggedSets ?? 0);
  const rankT = useT(ranksMessages);
  const locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const preview = workout && ranksEnabled() ? previewWorkoutPoints(workout) : undefined;
  // Stars above Legend have their own wording on the rank screen; skip them here.
  const next = lifetime === undefined || medalRank(lifetime) === 'legend' ? undefined : nextMedalRank(lifetime);
  let line: string | undefined;
  if (preview?.counted) {
    line = t('expectedPoints', { n: number(preview.points) }, preview.points);
    if (next && next.needed > 0) line = t('pointsWithNext', { points: line,
      next: rankT('workoutNext', { n: number(next.needed), tier: rankT(next.rank) }, next.needed) });
  } else if (preview?.reason === 'short') {
    line = t('pointsShort', { n: number(preview.minMinutes) }, preview.minMinutes);
  } else if (preview?.reason === 'sets' && workout) {
    line = t('pointsSets', { n: workout.plannedSets, logged: number(workout.loggedSets), planned: number(workout.plannedSets), min: number(preview.minSets) });
  }
  return <section className="glass-strong space-y-card-gap rounded-card p-section text-center">
    <h1 className={painHeadline ? 'text-title font-extrabold' : 'text-3xl font-extrabold'}>
      {painHeadline ? pt(painHeadline, { n: number(painSkipped) }) : t('workoutComplete')}</h1>
    {line && <p className={preview?.counted ? 'font-bold' : 'text-muted'}>{line}</p>}
    <p className="text-muted">{t('savedOnYourPhoneYourCoachWill')}</p>
    {onBack ? <Button variant="secondary" className="inline-flex min-h-12 items-center px-page-x" onClick={onBack}>{t('cachedWorkouts')}</Button> :
    <Link href="/player" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{t('backToHome')}</Link>}
  </section>;
}
