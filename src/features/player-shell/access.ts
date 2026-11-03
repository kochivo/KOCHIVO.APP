import { daysBetween } from '@/lib/dates';

export function accessState({ accessUntil, archivedAt, today }: {
  accessUntil: string; archivedAt: string | null; today: string;
}): 'active' | 'ending' | 'ended' | 'archived' {
  if (archivedAt) return 'archived';
  if (accessUntil < today) return 'ended';
  return daysBetween(today, accessUntil) <= 3 ? 'ending' : 'active';
}
