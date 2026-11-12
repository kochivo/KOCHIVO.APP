import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { uuidv7 } from '@/core/offline/ids';
import { coachSlug } from '@/lib/coach-slug';
import { coachRequestValues } from '@/lib/coach-request-status';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { profile } from './auth-client';
import { homeFor } from '../routing';
import { packageSelection } from '../package-selection';

async function liveLinkStatus(client: SupabaseClient<AppDatabase>, playerId: string, captainId: string) {
  const link = await client.from('coach_clients').select('captain_id')
    .eq('player_id', playerId).is('archived_at', null).maybeSingle();
  if (link.error) throw link.error;
  return link.data ? (link.data.captain_id === captainId ? 'member' : 'linked') : undefined;
}

export async function completeCoachRequest(client: SupabaseClient<AppDatabase>, rawSlug: string, input?: unknown) {
  const slug = coachSlug(rawSlug);
  if (!slug) throw new Error('invalid coach');
  const user = await profile(client);
  if (user?.admin) return homeFor(user);
  if (!user || (user.role === 'captain' && user.roleConfirmed)) throw new Error('player required');
  if (!user.roleConfirmed) {
    const result = await client.rpc('confirm_role', { p_role: 'player' });
    if (result.error) throw result.error;
  }
  const coach = await client.rpc('coach_public_profile', { slug });
  if (coach.error) throw coach.error;
  const captain = coach.data?.[0];
  if (!captain) throw new Error('coach unavailable');
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('unauthenticated');
  const playerId = auth.data.user.id;
  const statusUrl = (status: CoachRequestStatus) => `/c/${slug}?requested=${coachRequestValues[status]}`;
  const linked = await liveLinkStatus(client, playerId, captain.id);
  if (linked) return statusUrl(linked);
  const selection = packageSelection(input);
  const pkg = selection.package ? await client.from('captain_packages').select('id')
    .eq('id', selection.package).eq('captain_id', captain.id).is('archived_at', null).maybeSingle() : null;
  if (pkg?.error) throw pkg.error;
  const offer = selection.offer && pkg?.data ? await client.from('captain_offers').select('id')
    .eq('id', selection.offer).eq('captain_id', captain.id).maybeSingle() : null;
  if (offer?.error) throw offer.error;
  // The database trigger repeats applicability checks at insertion time without consuming capacity.
  const request = await client.from('coach_join_requests').insert({ id: uuidv7(), captain_id: captain.id, player_id: playerId,
    ...(pkg?.data ? { package_id: pkg.data.id, offer_id: offer?.data?.id ?? null } : {}) });
  if (!request.error) return statusUrl('sent');
  if (request.error.code !== '23505') throw request.error;
  const pending = await client.from('coach_join_requests').select('id')
    .eq('player_id', playerId).eq('captain_id', captain.id).eq('status', 'pending').maybeSingle();
  if (pending.error) throw pending.error;
  if (pending.data) return statusUrl('sent');
  const freshLink = await liveLinkStatus(client, playerId, captain.id);
  if (freshLink) return statusUrl(freshLink);
  throw request.error;
}
