import { suggestDecision } from '@/features/readiness';
import type { VolumeWeek } from '../data/muscle-volume';
import { HIGH_VOLUME_THRESHOLD } from './heat';
import { muscles } from './muscle-map';

/** Today's readiness takes priority (80+ excellent, 50–79 average, <50 rest).
 * Without a score, any muscle above the heat scale's high-volume boundary needs rest.
 * Ties use the stable muscle order; totals count each working set once.
 */
export function summary(week?: VolumeWeek, readiness: number | null = null) {
  const volume = week?.muscles ?? {};
  const muscle = [...muscles].filter(key => (volume[key] ?? 0) > 0)
    .sort((a, b) => (volume[b] ?? 0) - (volume[a] ?? 0))[0];
  const decision = readiness === null
    ? Object.values(volume).some(sets => sets > HIGH_VOLUME_THRESHOLD) ? 'rest' : 'keep'
    : suggestDecision(readiness);
  return { total: week?.total ?? 0,
    mostWorked: muscle ? { muscle, sets: volume[muscle] ?? 0 } : null,
    recovery: decision === 'keep' ? 'excellent' : decision === 'reduce' ? 'average' : 'needsRest' } as const;
}
