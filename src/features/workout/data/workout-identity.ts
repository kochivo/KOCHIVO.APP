'use server';
import { supabaseServer } from '@/core/supabase/server';
import { unstable_rethrow } from 'next/navigation';

export async function fetchWorkoutIdentity(): Promise<string | undefined> {
  try {
    const client = await supabaseServer();
    const { data, error } = await client.auth.getClaims();
    return error ? undefined : data?.claims.sub;
  } catch (error) {
    unstable_rethrow(error);
    // Focus mode can resume from the cached snapshot without a network lookup.
    return undefined;
  }
}
