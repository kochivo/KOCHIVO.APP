import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { internationalEnabled } from '@/lib/international-enabled';
import { messages } from './messages';

export function formCopy(locale: Locale, style?: ArabicStyle) {
  return locale === 'ar' && style === 'standard' && internationalEnabled()
    ? messages.arStd ?? messages.ar : messages[locale];
}
