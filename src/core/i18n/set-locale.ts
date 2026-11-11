'use server';

import { cookies } from 'next/headers';
import { ARABIC_STYLE_COOKIE, LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, LOCALES, parseArabicStyle } from './locale';
import { internationalEnabled } from '@/lib/international-enabled';

export async function setLocale(value: unknown, style?: unknown): Promise<void> {
  if (!LOCALES.some(locale => locale === value)) throw new Error('Invalid locale');
  if (style !== undefined && !parseArabicStyle(style)) throw new Error('Invalid Arabic style');
  (await cookies()).set(LOCALE_COOKIE, String(value), LOCALE_COOKIE_OPTIONS);
  if (style !== undefined && internationalEnabled()) {
    (await cookies()).set(ARABIC_STYLE_COOKIE, String(style), LOCALE_COOKIE_OPTIONS);
  }
}
