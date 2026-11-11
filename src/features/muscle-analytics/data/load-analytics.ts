import { loadTodayReadiness } from '@/features/readiness';
import { fetchMuscleVolume } from './muscle-volume';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { readPlayerTimezone } from '@/core/timezone/player-timezone';
import { localDate } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';

export async function loadAnalytics(playerId: string, today: string, self: boolean, signal: AbortSignal) {
  signal.throwIfAborted();
  const timezone = internationalEnabled() ? await readPlayerTimezone(await loadSupabaseBrowser(), playerId) : undefined;
  const day = timezone ? localDate(new Date(), timezone) : today;
  const [weeks, readiness] = await Promise.all([
    fetchMuscleVolume(playerId, new Date(), timezone),
    loadTodayReadiness(playerId, day, self).catch(() => null),
  ]);
  signal.throwIfAborted();
  return { weeks, readiness };
}
