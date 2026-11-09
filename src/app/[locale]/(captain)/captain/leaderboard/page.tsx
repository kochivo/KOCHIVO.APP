'use client';

import { useLocale } from '@/core/i18n/client';
import { LeaderboardScreen, useLeaderboard, usePendingPoints } from '@/features/rank-review';

export default function LeaderboardPage() {
  const locale = useLocale();
  const board = useLeaderboard();
  const pending = usePendingPoints(board.reload);
  return <LeaderboardScreen locale={locale} board={board} pending={pending} />;
}
