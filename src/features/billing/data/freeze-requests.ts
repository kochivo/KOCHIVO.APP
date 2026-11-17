'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import { captainClient } from './client';
import { messages } from '../freeze/messages';
import type { ActionResult } from '../types';
import type { FreezeState, FreezeRequest } from '../freeze/types';

async function failure(error: unknown) {
  unstable_rethrow(error);
  return { error: (await getT(messages))('error') };
}

export async function loadFreezeState(): Promise<ActionResult<FreezeState>> {
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Player required');
    const playerId = auth.data.user.id;
    const link = await client.from('coach_clients').select('captain_id,frozen_until')
      .eq('player_id', playerId).is('archived_at', null).single();
    if (link.error) throw link.error;
    const [remaining, pending] = await Promise.all([
      client.rpc('remaining_freeze_days', { p_captain: link.data.captain_id }),
      client.from('freeze_requests').select('id').eq('player_id', playerId)
        .eq('captain_id', link.data.captain_id).eq('status', 'pending').maybeSingle(),
    ]);
    if (remaining.error || pending.error) throw remaining.error ?? pending.error;
    return { data: { captainId: link.data.captain_id, remaining: remaining.data,
      pendingId: pending.data?.id ?? null, frozenUntil: link.data.frozen_until } };
  } catch (error) { return failure(error); }
}

export async function listFreezeRequests(playerId?: string): Promise<ActionResult<FreezeRequest[]>> {
  try {
    const { client, captainId } = await captainClient();
    let query = client.from('freeze_requests').select('id,player_id,days,note,created_at')
      .eq('captain_id', captainId).eq('status', 'pending').order('created_at').order('id');
    if (playerId) query = query.eq('player_id', z.uuid().parse(playerId));
    const requests = await query;
    if (requests.error) throw requests.error;
    if (!requests.data.length) return { data: [] };
    const players = await client.from('profiles').select('id,full_name').in('id', requests.data.map(row => row.player_id));
    if (players.error) throw players.error;
    return { data: requests.data.map(row => ({ ...row, name: players.data.find(player => player.id === row.player_id)?.full_name ?? '' })) };
  } catch (error) { return failure(error); }
}

export async function sendFreezeRequest(input: unknown): Promise<ActionResult<true>> {
  try {
    const value = z.object({ id: z.uuid(), captainId: z.uuid(), days: z.number().int().min(1).max(90),
      note: z.string().max(200).nullable() }).strict().parse(input);
    const client = await supabaseServer();
    const result = await client.rpc('request_player_freeze', { p_id: value.id, p_captain: value.captainId, p_days: value.days, p_note: value.note });
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    return { data: true };
  } catch (error) { return failure(error); }
}

export async function cancelFreezeRequest(id: string): Promise<ActionResult<true>> {
  try {
    const client = await supabaseServer();
    const result = await client.rpc('cancel_freeze_request', { p_id: z.uuid().parse(id) });
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    return { data: true };
  } catch (error) { return failure(error); }
}

export async function decideFreezeRequest(id: string, approve: boolean): Promise<ActionResult<true>> {
  try {
    const { client } = await captainClient();
    const result = await client.rpc('decide_freeze_request', { p_id: z.uuid().parse(id), p_approve: z.boolean().parse(approve) });
    if (result.error) throw result.error;
    revalidatePath('/captain/billing'); revalidatePath('/captain/players'); revalidatePath('/player');
    return { data: true };
  } catch (error) { return failure(error); }
}
