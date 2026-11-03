import 'server-only';
import { supabaseServer } from '@/core/supabase/server';

export async function captainClient() {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('captain session required');
  const profile = await client.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile.error || profile.data?.role !== 'captain') throw new Error('captain required');
  return { client, captainId: data.user.id };
}
