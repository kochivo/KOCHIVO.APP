'use client';

import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { messages } from '../messages';
import { useRankData } from '../hooks/use-rank-data';
import type { MyPoints } from '../data/load-my-points';
import { tierFor } from '../tiers';

export function RankChip({ points }: { points?: MyPoints }) {
  const t = useT(messages);
  const locale = useLocale();
  const loaded = useRankData(false, points === undefined);
  const active = points ?? (loaded.status === 'ready' ? loaded.data?.points : undefined);
  if (!active) return null;
  const tier = tierFor(active.lifetime);
  const n = formatNumber(active.lifetime, locale);
  return <Link href="/player/rank" aria-label={t('chip', { tier: t(tier), n })}
    className="glass inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-sm font-bold">
    <RankBadge tier={tier} size="sm" label={t(tier)} /><span>{t('points', { n })}</span>
  </Link>;
}
