'use client';

import { useCallback } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';

export function useWorkoutLink(today: string, enabled: boolean) {
  return useLiveQuery(useCallback(async () => {
    if (!enabled) return '/player';
    const db = localDb();
    const [snapshot, sessions] = await Promise.all([db.program_snapshot.get('active'), db.workout_sessions.toArray()]);
    if (!snapshot) return '/player';
    const { pickTodayDay, isRestDay } = await import('@/features/player-home');
    const day = pickTodayDay(snapshot, sessions, today);
    return day && !isRestDay(snapshot, sessions, today) && !day.is_rest_day
      ? `/player/workout/${encodeURIComponent(day.id)}` : '/player';
  }, [today, enabled]));
}
