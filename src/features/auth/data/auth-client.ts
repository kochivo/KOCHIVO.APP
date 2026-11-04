import { getLocale } from '@/core/i18n/server';
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type { Database } from '@/types/database';
import { authError } from '../errors';
import type { AuthUser } from '../routing';

export { supabaseServer as authClient } from '@/core/supabase/server';

export type ActionResult = { error?: string; redirect?: string; message?: string; codeEmail?: string; recoveryReady?: boolean; recoveryInvalid?: boolean };
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
  const membership = await client.rpc('is_admin');
  if (membership.error) throw membership.error;
  return { role: result.data.role, roleConfirmed: result.data.role_confirmed, admin: membership.data === true };
}
export async function runAction(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try { return await work(); } catch (error) { unstable_rethrow(error); return { error: authError(error, await getLocale()) }; }
}
