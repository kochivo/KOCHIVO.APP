'use client';

import { useLocale } from '@/core/i18n/client';
import { LeaderboardScreen, useLeaderboard } from '@/features/rank-review';

export default function LeaderboardPage() {
  const locale = useLocale();
  const board = useLeaderboard();
  return <LeaderboardScreen locale={locale} board={board} />;
}
