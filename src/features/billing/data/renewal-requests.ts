'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages } from '../choice/messages';
import { captainClient } from './client';
import { fetchPackageCatalog } from './catalog-read';

async function playerContext() {
  if (!captainWorkspaceEnabled()) throw new Error('Workspace disabled');
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Player required');
  const playerId = auth.data.user.id;
  const link = await client.from('coach_clients').select('captain_id,pending').eq('player_id', playerId).is('archived_at', null).single();
  if (link.error || link.data.pending) throw new Error('Membership unavailable');
  return { client, playerId, captainId: link.data.captain_id };
}
async function failure(error: unknown): Promise<{ error: string; data?: never; ok?: never; fallback?: never }> {
  unstable_rethrow(error);
  return { error: (await getT(messages))('error') };
}
export async function loadRenewalChoice() {
  try {
    const { client, playerId, captainId } = await playerContext();
    const [catalog, requests, profile] = await Promise.all([
      fetchPackageCatalog(captainId),
      client.from('player_renewal_requests').select('id').eq('player_id', playerId).eq('captain_id', captainId).eq('status', 'pending').maybeSingle(),
      client.rpc('my_captain_profile'),
    ]);
    if (requests.error || profile.error) throw requests.error ?? profile.error;
    return { error: undefined, data: { catalog: { ...catalog, tiers: catalog.tiers.map(tier => ({ ...tier,
      features: Array.isArray(tier.features) ? tier.features.filter((v): v is string => typeof v === 'string') : [] })) },
    name: profile.data?.[0]?.full_name ?? '', pending: requests.data?.id ?? null, now: new Date().toISOString() } };
  } catch (error) { return failure(error); }
}
export async function requestPlayerRenewal(input: unknown) {
  try {
    const selected = z.object({ packageId: z.uuid(), offerId: z.uuid().nullable() }).strict().parse(input);
    const { client, playerId, captainId } = await playerContext();
    const result = await client.from('player_renewal_requests').insert({ id: uuidv7(), player_id: playerId,
      captain_id: captainId, package_id: selected.packageId, offer_id: selected.offerId });
    if (result.error) throw result.error;
    revalidatePath('/captain/players');
    return { ok: true, error: undefined };
  } catch (error) { return failure(error); }
}
export async function listRenewalRequests(playerId?: string) {
  try {
    const { client, captainId } = await captainClient();
    let query = client.from('player_renewal_requests').select('id,player_id,package_id,created_at').eq('captain_id', captainId).eq('status', 'pending').order('created_at').order('id');
    if (playerId) query = query.eq('player_id', z.uuid().parse(playerId));
    const requests = await query;
    if (requests.error) throw requests.error;
    const [players, packages] = await Promise.all([
      client.from('profiles').select('id,full_name').in('id', requests.data.map(r => r.player_id)),
      client.from('captain_packages').select('id,name,price_egp').in('id', requests.data.map(r => r.package_id)),
    ]);
    if (players.error || packages.error) throw players.error ?? packages.error;
    return { error: undefined, data: requests.data.map(r => ({ ...r, name: players.data.find(p => p.id === r.player_id)?.full_name ?? '',
      package: packages.data.find(p => p.id === r.package_id)?.name ?? '' })) };
  } catch (error) { return failure(error); }
}
export async function decideRenewalRequest(id: string, status: 'approved' | 'declined' | 'cancelled') {
  try {
    z.uuid().parse(id);
    z.enum(['approved', 'declined', 'cancelled']).parse(status);
    const client = await supabaseServer();
    const result = await client.rpc('decide_player_renewal', { p_request: id, p_status: status });
    if (result.error) throw result.error;
    revalidatePath('/captain/players'); revalidatePath('/captain/billing'); revalidatePath('/player');
    return { ok: true, fallback: result.data, error: undefined };
  } catch (error) { return failure(error); }
}
