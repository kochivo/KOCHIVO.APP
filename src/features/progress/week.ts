import { saturdayWeek } from '@/lib/dates';

export function weekStart(today: string): string {
  const start = saturdayWeek(today)[0];
  if (start === undefined) throw new Error('Week start missing');
  return start;
}
