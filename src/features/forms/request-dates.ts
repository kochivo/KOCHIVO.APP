import { localDate } from '@/lib/dates';
import { timezoneMidnight } from '@/lib/timezone';

export function requestDueAt(date: string, timezone: string): string | null {
  if (!date) return null;
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  // Use the following midnight so DST changes during the selected day are included.
  return new Date(timezoneMidnight(localDate(next, 'UTC'), timezone) - 1000).toISOString();
}
