'use client';

import { useCallback, useEffect } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { refreshMealLogs } from '../data/refresh-meal-logs';

export function useMealLogs(today: string, onError?: (error: unknown) => void, retryKey = 0) {
  useEffect(() => {
    const refresh = () => { void refreshMealLogs(today).catch(onError ?? (() => {})); };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [today, onError, retryKey]);
  const read = useCallback(() => localDb().meal_logs.filter((row) => row.log_date === today && !row.deleted_at).toArray(), [today]);
  const rows = useLiveQuery(read, onError, retryKey);
  return rows?.filter((row) => row.log_date === today && !row.deleted_at);
}
