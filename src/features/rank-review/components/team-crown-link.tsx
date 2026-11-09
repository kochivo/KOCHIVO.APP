'use client';

import Link from 'next/link';
import { useLocale } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { RankBadge } from '@/ui';
import { usePendingPoints } from '../hooks/use-pending-points';
import { messages } from '../messages';

export function TeamCrownLink({ pendingCount, locale: suppliedLocale }: {
  pendingCount?: number | null; locale?: Locale;
}) {
  const activeLocale = useLocale();
  const locale = suppliedLocale ?? activeLocale;
  const pending = usePendingPoints(undefined, pendingCount === undefined);
  const count = pending.error ? null : pendingCount === undefined ? pending.rows?.length : pendingCount;
  const t = createT(messages, locale);
  return <Link href="/captain/leaderboard" className="glass mb-4 flex min-h-12 items-center gap-3 rounded-card p-3">
    <RankBadge tier="crown" size="sm" label={t('crown')} />
    <span className="flex-1 font-bold">{t('title')}</span>
    {count != null && count > 0 && <span className="text-sm text-muted">{t('pendingCount', { count: formatNumber(count, locale) })}</span>}
  </Link>;
}
