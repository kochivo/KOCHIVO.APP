'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, LOCALES } from './locale';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArabicStyleDatabase } from './profile';

export async function setLocale(value: unknown): Promise<void> {
  if (!LOCALES.some(locale => locale === value)) throw new Error('Invalid locale');
  const { supabaseServer } = await import('@/core/supabase/server');
  const client = await supabaseServer();
  const { data } = await client.auth.getClaims();
  if (data?.claims.sub) {
    const { error } = await (client as unknown as SupabaseClient<ArabicStyleDatabase>).from('profiles')
      .update({ locale: value === 'en' ? 'en' : 'ar' }).eq('id', data.claims.sub);
    if (error) throw error;
  }
  (await cookies()).set(LOCALE_COOKIE, String(value), LOCALE_COOKIE_OPTIONS);
}
