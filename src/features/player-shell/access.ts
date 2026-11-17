import { daysBetween } from '@/lib/dates';

export function subscriptionNotStarted(startsOn: string | null | undefined, today: string): boolean {
  return !!startsOn && startsOn > today;
}

export function accessState({ accessUntil, archivedAt, today, awaitingPlansAt }: {
  accessUntil: string; archivedAt: string | null; today: string; awaitingPlansAt?: string | null;
}): 'active' | 'ending' | 'ended' | 'archived' {
  if (archivedAt) return 'archived';
  if (awaitingPlansAt) return 'active';
  if (accessUntil < today) return 'ended';
  return daysBetween(today, accessUntil) <= 3 ? 'ending' : 'active';
}
