'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useResource } from '@/core/resource';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { loadMyPoints, nextMedalRank, medalRank, MEDAL_RANKS, ranksMessages } from '@/features/ranks';
import { Medal } from '@/ui/medal';
import { ErrorState, LoadingState } from '@/ui';
import { formatNumber } from '@/lib/format';
import { messages } from '../v6-messages';
import { buttonClass } from '@/ui/button';

export function RankOverview() {
  const t = useT(messages);
  const ranks = useT(ranksMessages);
  const locale = useLocale();
  const load = useCallback(() => loadMyPoints(), []);
  const result = useResource(`player-progress-rank:${localDb().userId}`, load);
  if (result.status === 'error') return <ErrorState message={t('rankFailed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />;
  if (!result.data) return <LoadingState variant="detail" />;
  const next = nextMedalRank(result.data.lifetime);
  const rank = medalRank(result.data.lifetime);
  return <Link href="/player/rank" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-16 items-center gap-stack p-card" })}>
    <Medal rank={MEDAL_RANKS.findIndex(entry => entry.rank === rank) as 0 | 1 | 2 | 3 | 4 | 5 | 6} size={32} label={ranks(rank)} />
    <div className="min-w-0 flex-1"><p className="text-sm">{ranks(rank)}</p>
      <p className="mt-inline text-xs text-faint">{t('nextRank', { n: next.needed, points: formatNumber(next.needed, locale), tier: ranks(next.rank) })}</p></div>
    <ChevronLeft aria-hidden className="size-4 text-faint ltr:rotate-180" />
  </Link>;
}
