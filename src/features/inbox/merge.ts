import type { InboxItem } from './types';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { messages } from './messages';

export function mergeInbox(forms: Extract<InboxItem, { kind: 'form' }>[], checkIns: Extract<InboxItem, { kind: 'checkin' }>[]): InboxItem[] {
  return [...forms, ...checkIns].sort((a, b) =>
    Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
}
export function ageLabel(createdAt: string, now: Date, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(createdAt)) / 3600000));
  if (hours < 1) return t('now');
  if (hours < 24) return t('hours', { n: hours, count: formatNumber(hours, locale) });
  const days = Math.floor(hours / 24);
  if (days === 1) return t('yesterday');
  return t('days', { n: days, count: formatNumber(days, locale) });
}
export function quickReplies(kind: InboxItem['kind'], locale: Locale = 'ar'): string[] {
  const t = createT(messages, locale);
  return kind === 'form'
    ? [t('greatForm'), t('straightBack'), t('lowerWeight')]
    : [t('greatProgress'), t('focusFood'), t('adjustProgram')];
}
