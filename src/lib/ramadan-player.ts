import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { RamadanDatabase } from './ramadan-types';
export async function loadPlayerRamadan() {
  const client = (await loadSupabaseBrowser()) as unknown as SupabaseClient<RamadanDatabase>;
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Missing session');
  const [status, profile] = await Promise.all([client.rpc('my_ramadan'),
    client.from('profiles').select('prayer_city,timezone').eq('id', auth.data.user.id).single()]);
  if (status.error || profile.error || !status.data[0]) throw new Error('Could not load Ramadan');
  return { ...status.data[0], city: profile.data.prayer_city, timezone: profile.data.timezone };
}
