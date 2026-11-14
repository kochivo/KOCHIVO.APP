import 'server-only';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { LOCALE_COOKIE, parseLocale, resolveArabicStyle } from './locale';
import type { Locale } from './locale';
import { createT } from './messages';
import type { Messages } from './messages';
import { internationalEnabled } from '@/lib/international-enabled';
import { supabaseServer } from '@/core/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArabicStyleDatabase } from './profile';
import { devicePreference } from './device-preferences';

// React scopes this cache to a server render; never share locale state across requests.
const renderLocale = cache((): { value?: Locale } => ({}));

export function setRequestLocale(locale: Locale) {
  renderLocale().value = locale;
}

export async function getLocale() {
  const locale = renderLocale().value;
  if (locale) return locale;
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}
export async function getT<M extends Messages>(messages: M, locale?: Locale) {
  return createT(messages, locale ?? await getLocale(), await getArabicStyle());
}

const loadArabicProfile = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return undefined;
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) return undefined;
  const languageClient = client as unknown as SupabaseClient<ArabicStyleDatabase>;
  const result = await languageClient.from('profiles').select('timezone').eq('id', auth.data.claims.sub).maybeSingle();
  return result.data ?? undefined;
});

export async function getArabicStyle(profile?: { timezone?: string | null }) {
  if (!internationalEnabled()) return 'egyptian';
  const jar = await cookies();
  const selected = profile ?? await loadArabicProfile();
  const language = devicePreference(jar.get('kochivo.language')?.value) ?? (await headers()).get('accept-language')?.split(',')[0]?.split(';')[0];
  return resolveArabicStyle({ profileTimezone: selected?.timezone,
    deviceTimezone: devicePreference(jar.get('kochivo.timezone')?.value), language });
}
