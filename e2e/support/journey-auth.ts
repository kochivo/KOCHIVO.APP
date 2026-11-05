import { createServerClient } from '@supabase/ssr';
import type { BrowserContext } from '@playwright/test';
import type { Database } from '../../src/types/database';

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function journeyClient(context: BrowserContext) {
  const base = new URL(requiredEnv('E2E_BASE_URL'));
  if (base.href.toLowerCase().includes('kochivo.site')) throw new Error('Production journey is forbidden');
  return createServerClient<Database>(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
      auth: { autoRefreshToken: false, detectSessionInUrl: false },
      cookies: {
        getAll: async () => context.cookies(base.origin),
        setAll: async cookies => {
          await context.addCookies(cookies.map(({ name, value, options }) => ({
            name, value, domain: base.hostname, path: options.path ?? '/',
            httpOnly: options.httpOnly ?? false, secure: base.protocol === 'https:',
            sameSite: 'Lax' as const,
            ...(options.maxAge === 0 ? { expires: 1 } : {}),
          })));
        },
      },
    });
}

// Player entry uses OTP; seed only the normal SSR session cookie, with a public key.
export async function signInJourneyPlayer(context: BrowserContext) {
  const client = journeyClient(context);
  const { data, error } = await client.auth.signInWithPassword({
    email: requiredEnv('E2E_PLAYER_EMAIL'), password: requiredEnv('E2E_PLAYER_PASSWORD'),
  });
  if (error || !data.user) throw new Error('Journey player password sign-in failed');
  return { client, playerId: data.user.id };
}
