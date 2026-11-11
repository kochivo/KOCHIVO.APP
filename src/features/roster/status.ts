import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

import { daysBetween } from '@/lib/dates';

export type PlayerStatus = 'ending' | 'grace' | 'expired' | 'late' | 'active';
export interface StatusInput {
  accessUntil: string;
  startedOn: string;
  lastTrainingDate: string | null;
  today: string;
  playerToday?: string;
}

export function playerStatus({ accessUntil, startedOn, lastTrainingDate, today, playerToday }: StatusInput): PlayerStatus {
  const overdue = daysBetween(accessUntil, today);
  if (overdue > 3) return 'expired';
  if (overdue > 0) return 'grace';
  if (overdue >= -7) return 'ending';
  if (daysBetween(lastTrainingDate ?? startedOn, playerToday ?? today) >= 4) return 'late';
  return 'active';
}

export function lastSeenLabel(date: string | null, today: string, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  if (!date) return t('hasntStarted');
  const days = daysBetween(date, today);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  return t('daysAgoCount', { n: days, count: formatNumber(days, locale) });
}
