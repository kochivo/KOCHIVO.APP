'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, LOCALES } from './locale';

export async function setLocale(value: unknown): Promise<void> {
  if (!LOCALES.some(locale => locale === value)) throw new Error('Invalid locale');
  (await cookies()).set(LOCALE_COOKIE, String(value), LOCALE_COOKIE_OPTIONS);
}
