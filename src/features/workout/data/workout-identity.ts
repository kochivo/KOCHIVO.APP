'use server';
import { supabaseServer } from '@/core/supabase/server';

export async function fetchWorkoutIdentity(): Promise<string | undefined> {
  try {
    const client = await supabaseServer();
    const { data } = await client.auth.getUser();
    return data.user?.id;
  } catch {
    // Focus mode can resume from the cached snapshot without a network lookup.
    return undefined;
  }
}
