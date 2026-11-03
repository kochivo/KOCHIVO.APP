import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';

// Plain checks instead of Zod: this module ships to every settings screen, and two fields
// do not justify bundling a schema library there. Same rule as z.iso.datetime({ offset: true }).
const isoWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function field(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

export function demoExpiry(profile: unknown): string | null {
  const value = field(profile, 'demo_expires_at');
  return typeof value === 'string' && isoWithOffset.test(value) && !Number.isNaN(Date.parse(value)) ? value : null;
}

export function demoHours(expiresAt: string, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now.getTime()) / 3_600_000));
}

export function demoError(error: unknown, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const text = (key: string) => { const value = field(error, key); return typeof value === 'string' ? value : ''; };
  const message = `${text('code')} ${text('message')}`;
  if (message.includes('demo_limit')) return t('theDemoIsBusyTryAgain');
  if (/captcha|turnstile/i.test(message)) return t('completeTheVerificationAndTryAgain');
  return t('theDemoIsUnavailableRightNow');
}
