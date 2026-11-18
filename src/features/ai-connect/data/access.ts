import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@/core/supabase/server';
import { isMcpCaptain, mcpOrigin } from '@/features/mcp/server';

export const connectAccount = cache(async () => {
  const db = await supabaseServer();
  const { data, error } = await db.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || claims.is_anonymous === true) return null;
  const id = claims.sub;
  const result = await db.from('profiles').select('role,suspended_at,full_name,timezone').eq('id', id).maybeSingle();
  if (result.error) throw result.error;
  return { db, id, profile: result.data, eligible: isMcpCaptain(id, result.data) };
});

export async function connectedToolsSettings() {
  const origin = mcpOrigin();
  if (!origin) return null;
  const account = await connectAccount().catch(() => null);
  return account?.eligible ? { userId: account.id, url: `${origin}/api/mcp` } : null;
}
