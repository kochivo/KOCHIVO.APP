import { intlLocale } from '@/core/i18n/locale';
import type { Locale } from '@/core/i18n/locale';

/** Keep Latin digits for existing Arabic callers. */
export function formatNumber(value: number, locale: Locale = 'ar'): string {
  return value.toLocaleString(locale === 'ar' ? 'en-US' : intlLocale(locale));
}
