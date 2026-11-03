'use client';

import { useCallback } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { buildWeek } from '../week';

export function useWeekSessions(today: string, onError?: (error: unknown) => void, retryKey = 0) {
  const query = useCallback(() => {
    const week = buildWeek(today, [], []);
    return localDb().workout_sessions.where('training_date')
      .between(week[0]?.date ?? today, week[6]?.date ?? today, true, true).toArray();
  }, [today]);
  return useLiveQuery(query, onError, retryKey);
}
