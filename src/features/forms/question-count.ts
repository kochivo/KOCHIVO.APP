import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from './redesign/messages';

export function questionCount(n: number, locale: Locale, style?: ArabicStyle): string {
  return createT(messages, locale, style)('questions', { n, list: '' }).replace(/:.*$/, '');
}
