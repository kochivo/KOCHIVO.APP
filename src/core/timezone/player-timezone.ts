import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';

export async function readPlayerTimezone(client: SupabaseClient<AppDatabase>, id: string): Promise<string> {
  if (!internationalEnabled()) return DEFAULT_TIMEZONE;
  const result = await client.from('profiles').select('timezone').eq('id', id).maybeSingle();
  return profileTimezone(result.data?.timezone);
}
