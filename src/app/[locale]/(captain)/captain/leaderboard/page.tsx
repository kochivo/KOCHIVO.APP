'use client';

import { useLocale } from '@/core/i18n/client';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { LeaderboardScreen, RanksSoon, useLeaderboard } from '@/features/rank-review';

export default function LeaderboardPage() {
  const locale = useLocale();
  return ranksEnabled() ? <Board locale={locale} /> : <RanksSoon locale={locale} />;
}

function Board({ locale }: { locale: ReturnType<typeof useLocale> }) {
  const board = useLeaderboard();
  return <LeaderboardScreen locale={locale} board={board} />;
}
