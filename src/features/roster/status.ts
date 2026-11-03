import { daysBetween } from '@/lib/dates';

export type PlayerStatus = 'ending' | 'grace' | 'expired' | 'late' | 'active';
export interface StatusInput {
  accessUntil: string;
  startedOn: string;
  lastTrainingDate: string | null;
  today: string;
}

export function playerStatus({ accessUntil, startedOn, lastTrainingDate, today }: StatusInput): PlayerStatus {
  const overdue = daysBetween(accessUntil, today);
  if (overdue > 3) return 'expired';
  if (overdue > 0) return 'grace';
  if (overdue >= -7) return 'ending';
  if (daysBetween(lastTrainingDate ?? startedOn, today) >= 4) return 'late';
  return 'active';
}

export function lastSeenLabel(date: string | null, today: string): string {
  if (!date) return 'لسه مبدأش';
  const days = daysBetween(date, today);
  if (days <= 0) return 'النهارده';
  if (days === 1) return 'امبارح';
  // Arabic counts 3–10 take the plural, 11+ take the singular.
  return days <= 10 ? `من ${days} أيام` : `من ${days} يوم`;
}
