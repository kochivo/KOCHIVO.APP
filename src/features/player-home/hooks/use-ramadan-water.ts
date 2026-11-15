'use client';
import { useCallback } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { readDailyCheck } from '@/features/readiness';
import { nightWaterMl } from '../ramadan-water';
import type { WaterBaseline } from '../ramadan-water';
export function useRamadanWater(playerId: string | undefined, date: string, sunsetDate: string, night: boolean, onError: (error: unknown) => void) {
  const read = useCallback(async () => {
    if (!playerId) return 0;
    const dates = [...new Set([sunsetDate, date])];
    const rows = (await Promise.all(dates.map(day => readDailyCheck(localDb(), playerId, day)))).filter(row => row !== null);
    const key = `ramadan-water:${playerId}:${sunsetDate}`;
    const stored = window.localStorage.getItem(key);
    // Daily checks have no drink timestamps. Capture the daytime total as the night's baseline.
    let baseline: WaterBaseline = stored ? JSON.parse(stored) : { date: sunsetDate, water: rows.find(row => row.log_date === sunsetDate)?.water_ml ?? 0 };
    if (!night) baseline = { date: sunsetDate, water: rows.find(row => row.log_date === sunsetDate)?.water_ml ?? 0 };
    window.localStorage.setItem(key, JSON.stringify(baseline));
    return nightWaterMl(baseline, rows, night);
  }, [playerId, sunsetDate, date, night]);
  return useLiveQuery(read, onError);
}
