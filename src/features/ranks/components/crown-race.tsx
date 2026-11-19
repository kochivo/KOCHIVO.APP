'use client';

import { Crown, Gift } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { EmptyState, RankBadge } from '@/ui';
import type { MyPoints } from '../data/load-my-points';
import { messages } from '../messages';
import { CROWN_MIN_WORKOUTS } from '../tiers';

export function CrownRace({ points, holdsCrown, holderName }: {
  points: MyPoints & { crown_prize?: string | null }; holdsCrown: boolean; holderName?: string;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const needed = points.crown_needs_workouts;
  if (points.month_position === null) return <EmptyState icon={Crown} title={t('race')} body={t('noCaptain')} />;
  return <section className="glass-strong space-y-stack rounded-card p-card">
    <h2 className="font-bold">{t('race')}</h2>
    {points.crown_prize && <p className="flex items-center gap-inline break-words">
      <Gift aria-hidden="true" className="size-5 shrink-0" />{t('crownPrize', { prize: points.crown_prize })}
    </p>}
    <p className="text-3xl font-bold tabular-nums">{t('adherence', { n: formatNumber(points.adherence, locale) })}</p>
    <p>{t('workouts', { done: formatNumber(points.done, locale), planned: formatNumber(points.planned, locale) })}</p>
    {holdsCrown ? <div className="flex items-center gap-card-gap"><RankBadge tier="crown" label={t('crown')} />
      <p className="font-bold">{t('holder')}</p></div> : <>
      <p className="text-xl font-bold">{t('position', { n: formatNumber(points.month_position, locale) })}</p>
      <p>{needed !== null && needed > 0
        ? holderName ? t('crownWorkouts', { n: formatNumber(needed, locale), name: holderName })
          : t(needed === 1 ? 'needsWorkout' : 'needsWorkouts', { n: formatNumber(needed, locale) })
        : t('gap', { n: formatNumber(points.crown_gap, locale) })}</p>
    </>}
    <p className="text-sm text-muted">{t('rule', { n: formatNumber(CROWN_MIN_WORKOUTS, locale) })}</p>
    <p className="text-sm text-muted">{t('reset')}</p>
  </section>;
}
