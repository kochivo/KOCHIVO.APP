'use client';

import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { messages } from '../messages';
import { useRankData } from '../hooks/use-rank-data';
import type { MyPoints } from '../data/load-my-points';
import { legendStars, tierFor } from '../tiers';
import { buttonClass } from '@/ui/button';

export function RankChip({ points }: { points?: MyPoints }) {
  const t = useT(messages);
  const locale = useLocale();
  const loaded = useRankData(false, points === undefined);
  const active = points ?? (loaded.status === 'ready' ? loaded.data?.points : undefined);
  if (!active) return null;
  const tier = tierFor(active.lifetime);
  const stars = legendStars(active.lifetime);
  const label = stars ? t('legendWithStars', { n: formatNumber(stars, locale) }) : t(tier);
  const n = formatNumber(active.lifetime, locale);
  return <Link href="/player/rank" aria-label={t('chip', { tier: label, n })}
    className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center gap-inline px-stack text-sm font-bold" })}>
    <RankBadge tier={tier} stars={stars} size="sm" label={label} /><span>{t('points', { n })}</span>
  </Link>;
}
