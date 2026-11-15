import { actionTimezone } from '@/core/timezone/action-timezone';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { daysBetween, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { messages } from './packages/messages';
import type { PlayerBalance } from './pt-types';

export function balanceLabel(balance: PlayerBalance, today: string, locale: Locale, timezone = actionTimezone()): string {
  const t = createT(messages, locale);
  if (balance.pending) return t('pending');
  if (balance.awaiting_plans_at) return t('waitingForPlans');
  if (balance.sessions_left !== null) return t('sessionsLeft', { n: balance.sessions_left, count: formatNumber(balance.sessions_left, locale) });
  const date = balance.frozen_at ? localDate(new Date(balance.frozen_at), timezone) : today;
  return t('daysLeft', { count: formatNumber(Math.max(0, daysBetween(date, balance.access_until)), locale) });
}
