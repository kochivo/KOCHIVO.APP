'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadLeaderboard } from '@/features/ranks';
import type { LeaderboardRow } from '@/features/ranks';
import { currentMonth } from '../months';

export function useLeaderboard() {
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => currentMonth(now));
  const [result, setResult] = useState<{ month: string; revision: number; rows?: LeaderboardRow[]; error: boolean }>();
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const update = () => setNow(new Date());
    window.addEventListener('focus', update);
    return () => window.removeEventListener('focus', update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void loadLeaderboard(month).then(value => {
      if (!cancelled) setResult({ month, revision, rows: value, error: false });
    }).catch(() => { if (!cancelled) setResult({ month, revision, error: true }); });
    return () => { cancelled = true; };
  }, [month, revision]);
  const active = result?.month === month && result.revision === revision ? result : undefined;
  return { now, month, rows: active?.rows, error: active?.error ?? false, setMonth, reload };
}
