import type { LeaderboardRow } from '@/features/ranks';

export function rankingRows(rows: LeaderboardRow[], allTime: boolean): LeaderboardRow[] {
  return allTime ? [...rows].sort((a, b) => b.lifetime - a.lifetime ||
    (a.player_id ?? '').localeCompare(b.player_id ?? '')) : rows;
}
