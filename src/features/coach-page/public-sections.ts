import type { AppDatabase } from '@/types/app-database';

export type PublicPage = AppDatabase['public']['Functions']['coach_public_page']['Returns'][number];
export type PublicStats = AppDatabase['public']['Functions']['coach_public_stats']['Returns'];
export function spotsLabel(spots: number, accepting: boolean) {
  return !accepting ? 'full' : spots <= 10 ? 'spotsLeft' : null;
}
export function statsCells(stats: PublicStats, years: number | null) {
  if (!stats) return [];
  return [
    { key: 'players', value: stats.players, unit: '' },
    { key: 'workouts', value: stats.workouts_logged, unit: '' },
    { key: 'adherence', value: stats.adherence_pct, unit: '%' },
    ...(years === null ? [] : [{ key: 'years', value: years, unit: '' }]),
  ] as { key: 'players' | 'workouts' | 'adherence' | 'years'; value: number; unit: string }[];
}
export { validSpecialties } from '@/lib/public-specialties';
