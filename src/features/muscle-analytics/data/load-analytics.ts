import { loadTodayReadiness } from '@/features/readiness';
import { fetchMuscleVolume } from './muscle-volume';

export async function loadAnalytics(playerId: string, today: string, self: boolean, signal: AbortSignal) {
  signal.throwIfAborted();
  const [weeks, readiness] = await Promise.all([
    fetchMuscleVolume(playerId, new Date()),
    loadTodayReadiness(playerId, today, self).catch(() => null),
  ]);
  signal.throwIfAborted();
  return { weeks, readiness };
}
