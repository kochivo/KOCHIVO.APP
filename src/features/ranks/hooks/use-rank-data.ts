'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimezone } from '@/core/timezone/client';
import { loadMyPoints } from '../data/load-my-points';
import type { MyPoints } from '../data/load-my-points';
import { loadLeaderboard } from '../data/load-leaderboard';
import { loadCrownPrize } from '../data/load-crown-prize';
import type { LeaderboardRow } from '../types';
import { loadHallOfFame } from '../data/load-hall-of-fame';
import { loadMedals } from '../data/load-medals';
import { loadWeeklyPoints } from '../data/load-weekly-points';
import type { MedalCounts } from '../medals';
import type { HallOfFameRow } from '../data/load-hall-of-fame';

export type RankData = { points: MyPoints & { crown_prize?: string | null }; board: LeaderboardRow[];
  hall?: HallOfFameRow[]; hallError?: boolean; medals?: MedalCounts; weekly?: number };
export type RankStatus = 'loading' | 'error' | 'ready';

export function useRankData(board = true, enabled = true) {
  const timezone = useTimezone();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data?: RankData; status: RankStatus }>({ status: 'loading' });
  const hallRequest = useRef(0);
  const invalidateHall = useCallback(() => { hallRequest.current++; }, []);
  const retryHall = useCallback(async () => {
    const request = ++hallRequest.current;
    setState(current => current.data ? { ...current, data: { ...current.data, hallError: false } } : current);
    const hall = await loadHallOfFame().then(rows => ({ rows, error: false }), () => ({ rows: undefined, error: true }));
    if (request !== hallRequest.current) return;
    setState(current => current.data ? { ...current, data: { ...current.data, hall: hall.rows, hallError: hall.error } } : current);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      setState({ status: 'loading' });
      try {
        const [points, rows, prize, hall, medals, weekly] = await Promise.all([
          loadMyPoints(), board ? loadLeaderboard() : Promise.resolve([]), board ? loadCrownPrize() : Promise.resolve(null),
          board ? loadHallOfFame().then(rows => ({ rows, error: false })).catch(() => ({ rows: undefined, error: true }))
            : Promise.resolve({ rows: [], error: false }),
          board ? loadMedals() : Promise.resolve(undefined),
          board ? loadWeeklyPoints(new Date(), timezone) : Promise.resolve(undefined),
        ]);
        if (!cancelled) setState({ data: { points: { ...points, crown_prize: prize }, board: rows,
          hall: hall.rows, hallError: hall.error, medals, weekly }, status: 'ready' });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    }
    void load();
    return () => { cancelled = true; invalidateHall(); };
  }, [attempt, board, enabled, timezone, invalidateHall]);
  return { ...state, retryHall, retry: () => setAttempt(value => value + 1) };
}
