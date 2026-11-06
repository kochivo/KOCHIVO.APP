import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { coachSlug } from '../slug';

export async function loadCaptainSlug(): Promise<{ slug: string | null; error?: never } | { error: true }> {
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: true };
    const result = await client.from('profiles').select('public_slug').eq('id', auth.data.claims.sub).single();
    if (result.error || !result.data) return { error: true };
    return { slug: coachSlug(result.data.public_slug) };
  } catch (error) { unstable_rethrow(error); return { error: true }; }
}
