'use client';

import { useCallback } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';

export function useMealLogs(today: string, onError?: (error: unknown) => void, retryKey = 0) {
  const read = useCallback(() => localDb().meal_logs.filter((row) => row.log_date === today && !row.deleted_at).toArray(), [today]);
  const rows = useLiveQuery(read, onError, retryKey);
  return rows?.filter((row) => row.log_date === today && !row.deleted_at);
}
