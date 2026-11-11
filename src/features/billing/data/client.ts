import 'server-only';
import { cache } from 'react';
import { currentClaims } from '@/core/supabase/claims';
import { supabaseServer } from '@/core/supabase/server';

export const captainClient = cache(async () => {
  const client = await supabaseServer();
  const { data, error } = await currentClaims();
  if (error || !data?.claims.sub) throw new Error('captain session required');
  const profile = await client.from('profiles').select('role').eq('id', data.claims.sub).single();
  if (profile.error || profile.data?.role !== 'captain') throw new Error('captain required');
  return { client, captainId: data.claims.sub };
});
