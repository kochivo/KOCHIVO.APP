import 'server-only';
import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';

export const getTimezoneProfile = cache(async () => {
  if (!internationalEnabled()) return null;
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    const id = auth.data?.claims.sub;
    if (auth.error || !id) return null;
    const result = await client.from('profiles').select('id,timezone,timezone_auto').eq('id', id).single();
    return result.error ? null : result.data;
  } catch (error) { unstable_rethrow(error); return null; }
});

export async function getTimezone(): Promise<string> {
  if (!internationalEnabled()) return DEFAULT_TIMEZONE;
  return profileTimezone((await getTimezoneProfile())?.timezone);
}

export const getPlayerTimezone = cache(async (id: string): Promise<string> => {
  if (!internationalEnabled()) return DEFAULT_TIMEZONE;
  try {
    const client = await supabaseServer();
    const result = await client.from('profiles').select('timezone').eq('id', id).single();
    return profileTimezone(result.data?.timezone);
  } catch (error) { unstable_rethrow(error); return DEFAULT_TIMEZONE; }
});
