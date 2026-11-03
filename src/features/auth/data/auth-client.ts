import { getLocale } from '@/core/i18n/server';
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import type { Database } from '@/types/database';
import { authError } from '../errors';
import type { AuthUser } from '../routing';

export { supabaseServer as authClient } from '@/core/supabase/server';

export type ActionResult = { error?: string; redirect?: string; message?: string; recoveryReady?: boolean };
export async function siteOrigin() {
  // The Host header is client-controlled; never build auth email or OAuth links from it in production.
  if (process.env.NODE_ENV === 'production') return 'https://kochivo.site';
  const host = (await headers()).get('host') ?? 'localhost:3000';
  return `http://${host}`;
}
export async function profile(client: SupabaseClient<Database>): Promise<AuthUser | null> {
  const { data: claims, error } = await client.auth.getClaims();
  if (error) throw error;
  if (!claims?.claims.sub) return null;
  const result = await client.from('profiles').select('role, role_confirmed').eq('id', claims.claims.sub).single();
  if (result.error) throw result.error;
  return { role: result.data.role, roleConfirmed: result.data.role_confirmed };
}
export async function runAction(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try { return await work(); } catch (error) { return { error: authError(error, await getLocale()) }; }
}
