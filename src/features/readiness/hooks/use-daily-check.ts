'use client';
import { useTimezone } from '@/core/timezone/client';

import { useCallback, useEffect, useState } from 'react';
import { localDb, stableId, useLiveQuery } from '@/core/offline';
import type { DailyCheckRow } from '@/core/offline/tables';
import { readDailyCheck, saveDailyCheck } from '../data/daily-checks';
import { refreshCheck } from '../data/refresh-check';

export function useDailyCheck(playerId: string | undefined, today: string) {
  const timezone = useTimezone();
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [savedKey, setSavedKey] = useState('');
  const key = `${playerId}:${today}`;
  const onError = useCallback(() => setError(true), []);
  const query = useCallback(async () => {
    if (!playerId || !today) return { key, row: null, pending: false };
    const db = localDb();
    const id = await stableId('daily_check', playerId, today);
    const [row, entry] = await Promise.all([readDailyCheck(db, playerId, today),
      db.outbox.where('[table+row_id]').equals(['daily_checks', id]).first()]);
    return { key, row, pending: Boolean(entry) };
  }, [key, playerId, today]);
  const value = useLiveQuery(query, onError, retryKey);
  const row = value?.key === key ? value.row : undefined;
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (playerId && today && navigator.onLine) void refreshCheck(localDb(), playerId, today)
        .catch(() => { if (!cancelled) setError(true); });
    };
    refresh();
    window.addEventListener('online', refresh);
    return () => { cancelled = true; window.removeEventListener('online', refresh); };
  }, [playerId, today, retryKey]);
  const save = async (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>, water = 0) => {
    if (!playerId || !today) return;
    try { await saveDailyCheck(localDb(), playerId, patch, water, Date.now(), timezone); setSavedKey(key); setError(false); }
    catch { setError(true); }
  };
  return { row, error, saved: savedKey === key, pending: value?.key === key && value.pending,
    save, retry: () => { setError(false); setRetryKey(value => value + 1); } };
}
