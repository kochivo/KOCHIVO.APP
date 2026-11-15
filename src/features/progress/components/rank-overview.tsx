'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { Medal, ChevronLeft } from 'lucide-react';
import { useResource } from '@/core/resource';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { loadMyPoints, nextTier, tierFor, ranksMessages } from '@/features/ranks';
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
  const next = nextTier(result.data.lifetime);
  return <Link href="/player/rank" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-16 items-center gap-3 p-5" })}>
    <Medal aria-hidden className="size-5 shrink-0 text-warn" />
    <div className="min-w-0 flex-1"><p className="text-sm">{ranks(tierFor(result.data.lifetime))}</p>
      <p className="mt-1 text-xs text-faint">{t('nextRank', { points: formatNumber(next.needed, locale), tier: ranks(next.tier) })}</p></div>
    <ChevronLeft aria-hidden className="size-4 text-faint ltr:rotate-180" />
  </Link>;
}
