'use client';
import { useCallback } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { pickTodayDay } from '@/features/player-home';
export function useRamadanDuration(today: string) {
  return useLiveQuery(useCallback(async () => {
    const db = localDb(), snapshot = await db.program_snapshot.get('active');
    if (!snapshot) return 0;
    const sessions = await db.workout_sessions.toArray();
    const day = pickTodayDay(snapshot, sessions, today);
    if (!day || day.is_rest_day) return 0;
    const exerciseMinutes = Math.round(day.exercises.reduce((sum, exercise) => sum + exercise.sets * (40 + exercise.rest_seconds), 0) / 60 / 5) * 5;
    const warmupMinutes = Math.ceil((day.warmup?.items ?? []).reduce((sum, item) => sum +
      (item.unit === 'min' ? item.amount * 60 : item.unit === 'sec' ? item.amount : 0), 0) / 60);
    return exerciseMinutes + warmupMinutes + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0);
  }, [today]));
}
