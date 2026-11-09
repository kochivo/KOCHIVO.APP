'use client';

import { Crown } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { EmptyState, RankBadge } from '@/ui';
import type { MyPoints } from '../data/load-my-points';
import { messages } from '../messages';
import { CROWN_MIN_MONTHLY } from '../tiers';

export function CrownRace({ points, holdsCrown }: { points: MyPoints; holdsCrown: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  if (points.month_position === null) return <EmptyState icon={Crown} title={t('race')} body={t('noCaptain')} />;
  return <section className="glass-strong space-y-3 rounded-card p-5">
    <h2 className="font-bold">{t('race')}</h2>
    {holdsCrown ? <div className="flex items-center gap-4"><RankBadge tier="crown" label={t('crown')} />
      <p className="font-bold">{t('holder')}</p></div> : <>
      <p className="text-xl font-bold">{t('position', { n: formatNumber(points.month_position, locale) })}</p>
      <p>{t('gap', { n: formatNumber(points.crown_gap, locale) })}</p>
    </>}
    <p>{t('monthly', { n: formatNumber(points.monthly, locale) })}</p>
    <p className="text-sm text-muted">{t('minimum', { n: formatNumber(CROWN_MIN_MONTHLY, locale) })}</p>
    <p className="text-sm text-muted">{t('reset')}</p>
  </section>;
}
