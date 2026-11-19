'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { legendStars, loadMyPoints, medalRank, MEDAL_RANKS, nextMedalRank, ranksMessages } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { Medal } from '@/ui/medal';
import { ProgressBar } from '@/ui/progress-bar';
import { SkeletonCard } from '@/ui/skeleton';
import { messages } from '../v4/messages';

export function HomeRankCard({ playerId }: { playerId?: string }) {
  const enabled = ranksEnabled();
  const { data, status } = useResource(enabled && playerId ? `player-home-rank:${playerId}` : null, loadMyPoints);
  const t = useT(ranksMessages);
  const copy = useT(messages);
  const locale = useLocale();
  if (!enabled || !playerId || status === 'error') return null;
  if (!data) return <SkeletonCard lines={1} />;
  const number = (value: number) => formatNumber(value, locale);
  const rank = medalRank(data.lifetime);
  const index = MEDAL_RANKS.findIndex(entry => entry.rank === rank) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const stars = legendStars(data.lifetime);
  const threshold = (MEDAL_RANKS[index]?.threshold ?? 0) + stars * 300;
  const next = nextMedalRank(data.lifetime);
  const goal = rank === 'legend' ? t('nextStar', { n: number(next.needed), next: number(stars + 1) }, next.needed)
    : t('next', { n: number(next.needed), tier: t(next.rank) }, next.needed);
  const label = stars ? t('legendWithStars', { n: number(stars) }) : t(rank);
  return <Link href="/player/rank" className="press glass flex min-h-12 items-center gap-stack rounded-card px-card py-stack">
    <span aria-hidden className="flex shrink-0 items-center">
      {index > 0 && <Medal rank={(index - 1) as 0 | 1 | 2 | 3 | 4 | 5} size={24} label="" />}
      <Medal rank={index} size={34} label={label} />
      {index < 6 && <Medal rank={(index + 1) as 1 | 2 | 3 | 4 | 5 | 6} size={24} label="" locked />}
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-inline">
      <span className="flex flex-wrap items-baseline gap-inline text-xs text-warn"><b className="text-sm text-ink">{label}</b>{t('points', { n: number(data.lifetime) }, data.lifetime)}</span>
      <ProgressBar thin value={data.lifetime - threshold} max={data.lifetime + next.needed - threshold} aria-label={goal}
        className="[&>div]:bg-warn" />
      <span className="text-micro text-muted">{data.month_position != null && <>{copy('place', { place: number(data.month_position) })} · </>}{goal}</span>
    </div>
    <ChevronLeft aria-hidden className="size-4 shrink-0 text-faint ltr:rotate-180" />
  </Link>;
}
