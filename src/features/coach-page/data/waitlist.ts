'use server';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { coachSlug } from '../slug';

export async function joinWaitlist(rawSlug: string): Promise<{
  status?: 'waitlisted' | 'member' | 'failure'; redirect?: string;
}> {
  const slug = coachSlug(rawSlug);
  if (!captainWorkspaceEnabled() || !slug) return { status: 'failure' };
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error) throw auth.error;
    if (!auth.data.user) return { redirect: `/login?tab=signup&next=${encodeURIComponent(`/c/${slug}`)}` };
    const [coach, page] = await Promise.all([
      client.rpc('coach_public_profile', { slug }), client.rpc('coach_public_page', { slug }),
    ]);
    if (coach.error || page.error || !coach.data?.[0] || !page.data?.[0]) return { status: 'failure' };
    const captainId = coach.data[0].id;
    const link = await client.from('coach_clients').select('captain_id').eq('player_id', auth.data.user.id)
      .eq('captain_id', captainId).is('archived_at', null).maybeSingle();
    if (link.error) throw link.error;
    if (link.data) return { status: 'member' };
    if (page.data[0].accepting) return { status: 'failure' };
    const result = await client.from('coach_waitlist').insert({ id: uuidv7(), captain_id: captainId, player_id: auth.data.user.id });
    // The partial unique index makes repeat taps idempotent without exposing player rows.
    if (result.error && result.error.code !== '23505') throw result.error;
    return { status: 'waitlisted' };
  } catch (error) { unstable_rethrow(error); return { status: 'failure' }; }
}
