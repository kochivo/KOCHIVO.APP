import 'server-only';
import { supabaseServer } from '@/core/supabase/server';

export async function captainClient() {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) throw new Error('captain session required');
  const profile = await client.from('profiles').select('role').eq('id', data.claims.sub).single();
  if (profile.error || profile.data?.role !== 'captain') throw new Error('captain required');
  return { client, captainId: data.claims.sub };
}
