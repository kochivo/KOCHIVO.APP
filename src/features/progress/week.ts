import type { CheckIn } from './data/checkins';
import { saturdayWeek } from '@/lib/dates';

export function weekStart(today: string): string {
  const start = saturdayWeek(today)[0];
  if (start === undefined) throw new Error('Week start missing');
  return start;
}

export function canOpenCheckin(today: string, checkins: readonly Pick<CheckIn, 'week_start'>[] | undefined, failed: boolean, sentWeek: string): boolean {
  if (!today || !checkins || failed) return false;
  const week = weekStart(today);
  return sentWeek !== week && !checkins.some(row => row.week_start === week);
}
