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
    const result = await (await supabaseServer()).rpc('pending_coach_join_requests');
    if (result.error) throw result.error;
    return { data: result.data ?? [] };
  } catch (error) { unstable_rethrow(error); return { error: t('loadFailure') }; }
}
export async function resolveJoinRequest(id: string, status: 'accepted' | 'declined') {
  const t = await getT(messages);
  try {
    const result = await (await supabaseServer()).rpc('resolve_coach_join_request', {
      p_request: id, p_status: status, p_link_id: uuidv7(),
    });
    if (result.error) throw result.error;
    revalidatePath('/captain'); revalidatePath('/captain/players');
    return { ok: true };
  } catch (error) { unstable_rethrow(error); return { error: t('failure') }; }
}
