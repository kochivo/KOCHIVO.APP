import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { supabaseServer } from '@/core/supabase/server';
import { authError } from '../errors';
import type { AuthUser } from '../routing';

type AuthDatabase = { public: {
  Tables: { profiles: { Row: { id: string; role: 'captain' | 'player'; role_confirmed: boolean }; Insert: never; Update: never; Relationships: [] } };
  Views: Record<string, never>;
  Functions: {
    confirm_role: { Args: { p_role: 'captain' | 'player' }; Returns: undefined };
    redeem_invite: { Args: { p_code: string }; Returns: string };
    invite_preview: { Args: { p_code: string }; Returns: { captain_name: string | null; valid: boolean }[] };
  };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
export type ActionResult = { error?: string; redirect?: string; message?: string; recoveryReady?: boolean };
export async function authClient() {
  // T-001 regenerates the database types; keep this card's RPC surface local until then.
  return await supabaseServer() as unknown as SupabaseClient<AuthDatabase>;
}
export async function siteOrigin() {
  // The Host header is client-controlled; never build auth email or OAuth links from it in production.
  if (process.env.NODE_ENV === 'production') return 'https://kochivo.site';
  const host = (await headers()).get('host') ?? 'localhost:3000';
  return `http://${host}`;
}
export async function profile(client: SupabaseClient<AuthDatabase>): Promise<AuthUser | null> {
  const { data: claims, error } = await client.auth.getClaims();
  if (error) throw error;
  if (!claims?.claims.sub) return null;
  const result = await client.from('profiles').select('role, role_confirmed').eq('id', claims.claims.sub).single();
  if (result.error) throw result.error;
  return { role: result.data.role, roleConfirmed: result.data.role_confirmed };
}
export async function runAction(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try { return await work(); } catch (error) { return { error: authError(error) }; }
}
