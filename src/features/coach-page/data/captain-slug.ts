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

function slugBase(fullName: unknown): string {
  const base = typeof fullName === 'string'
    ? fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
    : '';
  return base.length >= 3 ? base : 'coach';
}

function slugCandidates(fullName: unknown): string[] {
  const base = slugBase(fullName);
  const candidates = [base, `${base}-2`, `${base}-3`];
  for (let i = 0; i < 4; i++) candidates.push(`coach-${Math.random().toString(36).slice(2, 8)}`);
  return candidates.map((c) => c.slice(0, 30)).filter((c) => coachSlug(c));
}

/** Returns the coach's public slug, generating and saving one on first use so
 *  every approved coach always has a working join link. */
export async function ensureCaptainSlug(): Promise<{ slug: string | null; error?: never } | { error: true }> {
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: true };
    const id = auth.data.claims.sub;
    const result = await client.from('profiles').select('public_slug, full_name').eq('id', id).single();
    if (result.error || !result.data) return { error: true };
    const existing = coachSlug(result.data.public_slug);
    if (existing) return { slug: existing };
    for (const candidate of slugCandidates(result.data.full_name)) {
      const update = await client.from('profiles').update({ public_slug: candidate }).eq('id', id).is('public_slug', null).select('public_slug');
      if (!update.error && update.data?.length) return { slug: candidate };
      if (update.error && update.error.code !== '23505') return { error: true };
      // 23505 or a concurrent claim: try the next candidate.
    }
    const reloaded = await client.from('profiles').select('public_slug').eq('id', id).single();
    return { slug: coachSlug(reloaded.data?.public_slug) };
  } catch (error) { unstable_rethrow(error); return { error: true }; }
}
