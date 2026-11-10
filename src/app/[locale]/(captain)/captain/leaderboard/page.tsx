'use client';

import { notFound } from 'next/navigation';
import { useLocale } from '@/core/i18n/client';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { LeaderboardScreen, useLeaderboard } from '@/features/rank-review';

export default function LeaderboardPage() {
  if (!ranksEnabled()) notFound();
  const locale = useLocale();
  const board = useLeaderboard();
  return <LeaderboardScreen locale={locale} board={board} />;
}
