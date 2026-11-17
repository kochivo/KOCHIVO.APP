import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

export function restRemaining(endsAt: number | null, now: number): number {
  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function restAnnouncement(remaining: number, started: boolean, t: Translator<typeof messages> = createT(messages, 'ar')): string {
  if (!started) return '';
  if (remaining <= 0) return t('restFinished');
  return remaining <= 10 ? t('message10SecondsOrLessLeft') : t('restStarted');
}

export function formatRest(seconds: number, locale: Locale = 'ar'): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${formatNumber(Math.floor(whole / 60), locale)}:${formatNumber(whole % 60, locale).padStart(2, '0')}`;
}

export function extendRest(endsAt: number | null, now: number, seconds: number): number {
  return Math.max(endsAt ?? now, now) + seconds * 1000;
}

export function adjustRestDeadline(endsAt: number | null, now: number, seconds: -15 | 15): number | null {
  if (endsAt === null || endsAt <= now) return endsAt;
  return Math.max(now, endsAt + seconds * 1000);
}
