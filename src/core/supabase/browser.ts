import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/core/config/env';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | undefined;

/** Singleton browser client — used by client components and the offline sync transport. */
export function supabaseBrowser(): SupabaseClient<Database> {
  const env = publicEnv();
  client ??= createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
