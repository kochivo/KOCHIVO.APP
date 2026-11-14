import { describe, expect, it } from 'vitest';
import type { LeaderboardRow } from '@/features/ranks';
import { rankingRows } from './components/ranking-rows';

const rows: LeaderboardRow[] = [
  { player_id: 'a', display_name: 'A', position: 1, lifetime: 80, monthly: 30,
    adherence: 90, done: 9, planned: 10, tier: 'beginner', is_crown: true },
  { player_id: 'b', display_name: 'B', position: 2, lifetime: 120, monthly: 20,
    adherence: 80, done: 8, planned: 10, tier: 'champion', is_crown: false },
];

describe('ranking periods', () => {
  it('keeps the server monthly ranking', () => {
    expect(rankingRows(rows, false).map(row => row.player_id)).toEqual(['a', 'b']);
  });
  it('sorts all-time points without changing the monthly rows', () => {
    expect(rankingRows(rows, true).map(row => row.player_id)).toEqual(['b', 'a']);
    expect(rows.map(row => row.player_id)).toEqual(['a', 'b']);
  });
});
