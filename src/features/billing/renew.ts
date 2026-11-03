import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { formatDateAr } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export function renewalPreview(accessUntil: string, today: string, days: number) {
  const next = addDays(accessUntil, 1);
  const start = next > today ? next : today;
  return { start, end: addDays(start, days - 1) };
}

export function reminderText(playerName: string, accessUntil: string, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const date = formatDateAr(accessUntil, { day: 'numeric', month: 'long' }, locale);
  return t('reminder', { name: playerName, date });
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  return phone == null ? null : whatsappUrl({ phone, text });
}
