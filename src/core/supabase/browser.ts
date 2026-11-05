import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/core/config/env';
import type { AppDatabase } from '@/types/app-database';

let client: SupabaseClient<AppDatabase> | undefined;

/** Singleton browser client — used by client components and the offline sync transport. */
export function supabaseBrowser(): SupabaseClient<AppDatabase> {
  const env = publicEnv();
  client ??= createBrowserClient<AppDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
