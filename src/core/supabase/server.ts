import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv } from '@/core/config/env';
import type { AppDatabase } from '@/types/app-database';

/** Per-request server client for Server Components, Route Handlers and Server Actions. */
export async function supabaseServer(): Promise<SupabaseClient<AppDatabase>> {
  const env = publicEnv();
  const cookieStore = await cookies();
  return createServerClient<AppDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes the session.
        }
      },
    },
  });
}
