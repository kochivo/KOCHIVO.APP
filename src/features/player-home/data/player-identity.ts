'use server';
import { supabaseServer } from '@/core/supabase/server';
import { unstable_rethrow } from 'next/navigation';

export async function fetchPlayerIdentity() {
  let firstName: string | undefined;
  let playerId: string | undefined;
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.getClaims();
    if (!error && data?.claims.sub) {
      playerId = data.claims.sub;
      const profile = await client.from('profiles').select('full_name').eq('id', playerId)
        .maybeSingle<{ full_name: string }>();
      firstName = profile.data?.full_name.trim().split(/\s+/)[0] || undefined;
    }
  } catch (error) {
    unstable_rethrow(error);
    // The local program remains usable when the optional greeting lookup fails.
  }
  return { firstName, playerId };
}
