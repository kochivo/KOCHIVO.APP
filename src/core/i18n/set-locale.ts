'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, LOCALES } from './locale';

export async function setLocale(value: unknown): Promise<void> {
  if (!LOCALES.some(locale => locale === value)) throw new Error('Invalid locale');
  (await cookies()).set(LOCALE_COOKIE, String(value), {
    maxAge: 365 * 24 * 60 * 60, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
}
