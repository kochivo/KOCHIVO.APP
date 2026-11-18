import type { FileActivity } from './load-activity';
import type { FileMetric } from './measurements';
import type { Profile } from './types';

export function overviewMetrics(profile: Profile, activity: FileActivity): FileMetric[] {
  return (['weight', 'bodyFat'] as const).flatMap(key => {
    const points = [
      ...profile.checkIns.map(row => ({ date: row.weekStart, value: key === 'weight' ? row.weightKg : row.bodyFatPct })),
      ...activity.scans.map(row => ({ date: row.scan_date, value: key === 'weight' ? row.weight_kg : row.fat_pct })),
    ];
    const values = points.sort((a, b) => a.date.localeCompare(b.date)).flatMap(row => row.value == null ? [] : [row.value]);
    if (key === 'weight' && profile.intake) values.unshift(profile.intake.weightKg);
    const latest = values.at(-1), first = values[0];
    if (latest === undefined) return [];
    return [{ key, value: latest, change: values.length > 1 && first !== undefined ? Math.round((latest - first) * 10) / 10 : null }];
  });
}
