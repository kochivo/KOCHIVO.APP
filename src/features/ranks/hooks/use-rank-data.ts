'use client';

import { useEffect, useState } from 'react';
import { loadMyPoints } from '../data/load-my-points';
import type { MyPoints } from '../data/load-my-points';
import { loadLeaderboard } from '../data/load-leaderboard';
import { loadCrownPrize } from '../data/load-crown-prize';
import type { LeaderboardRow } from '../types';

export type RankData = { points: MyPoints & { crown_prize?: string | null }; board: LeaderboardRow[] };
export type RankStatus = 'loading' | 'error' | 'ready';

export function useRankData(board = true, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data?: RankData; status: RankStatus }>({ status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      setState({ status: 'loading' });
      try {
        const [points, rows, prize] = await Promise.all([
          loadMyPoints(), board ? loadLeaderboard() : Promise.resolve([]), board ? loadCrownPrize() : Promise.resolve(null),
        ]);
        if (!cancelled) setState({ data: { points: { ...points, crown_prize: prize }, board: rows }, status: 'ready' });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [attempt, board, enabled]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
