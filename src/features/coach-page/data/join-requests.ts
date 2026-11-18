'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

export async function loadJoinRequests() {
  const t = await getT(messages);
  try {
    const result = await (await supabaseServer()).rpc('pending_coach_join_packages');
    if (result.error) throw result.error;
    return { data: result.data ?? [] };
  } catch (error) { unstable_rethrow(error); return { error: t('loadFailure') }; }
}
export async function resolveJoinRequest(id: string, status: 'accepted' | 'declined') {
  const t = await getT(messages);
  try {
    const linkId = uuidv7();
    const client = await supabaseServer();
    const request = status === 'accepted'
      ? await client.from('coach_join_requests').select('player_id').eq('id', id).single()
      : null;
    if (request?.error) throw request.error;
    const result = await client.rpc('resolve_coach_join_request', {
      p_request: id, p_status: status, p_link_id: linkId,
    });
    if (result.error) throw result.error;
    revalidatePath('/captain'); revalidatePath('/captain/players');
    return { ok: true, playerId: request?.data?.player_id };
  } catch (error) { unstable_rethrow(error); return { error: t('failure') }; }
}
