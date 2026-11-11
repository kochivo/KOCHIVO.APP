'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { formsAccess } from './access';
import { loadPlayerRequests,loadRequest } from './request-load';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { supabaseServer } from '@/core/supabase/server';
import { requestRpc } from './request-rpc';

export async function requestPicker(playerId:string) {
  const {client,captain} = await formsAccess();
  z.uuid().parse(playerId);
  const forms = await client.from('forms').select('id,title').eq('captain_id',captain).is('archived_at',null).order('title').limit(100);
  const pending = await client.from('form_requests').select('id,form_id,due_at,reminded_at,forms!form_requests_form_id_fkey(title)').eq('player_id',playerId)
    .eq('captain_id',captain).is('answered_at',null).order('sent_at',{ascending:false}).limit(50);
  if (forms.error || pending.error) throw forms.error ?? pending.error;
  return {forms:forms.data,pending:pending.data};
}
export async function sendRequest(input:unknown) {
  const {client} = await formsAccess();
  const row = z.object({id:z.uuid(),form_id:z.uuid(),player_id:z.uuid(),due_at:z.iso.datetime({offset:true}).nullable()}).parse(input);
  const result = await requestRpc(client).rpc('send_custom_form_request',{p_id:row.id,p_form:row.form_id,p_player:row.player_id,p_due:row.due_at});
  return {ok:!result.error};
}
export async function remindRequest(id:string) {
  const {client} = await formsAccess();
  z.uuid().parse(id);
  const result = await requestRpc(client).rpc('remind_custom_form_request',{p_request:id});
  return {ok:!result.error && result.data === true};
}
export async function reviewRequest(id:string,reply:string) {
  const {client,captain} = await formsAccess();
  const parsed = z.object({id:z.uuid(),reply:z.string().trim().max(1000)}).parse({id,reply});
  const result = await client.from('form_requests').update({captain_reply:parsed.reply || null,reviewed_at:new Date().toISOString()})
    .eq('id',parsed.id).eq('captain_id',captain).not('answered_at','is',null).select('id').single();
  return {ok:!result.error};
}
export async function playerRequests(playerId:string) {
  if (!captainWorkspaceEnabled()) return [];
  const {client} = await formsAccess();
  return loadPlayerRequests(client,z.uuid().parse(playerId));
}
export async function requestDetail(id:string) {
  const {client} = await formsAccess();
  return loadRequest(client,z.uuid().parse(id));
}
export async function pendingRequests() {
  if (!captainWorkspaceEnabled()) return [];
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('auth');
    const result = await client.from('form_requests').select('id,due_at,forms!form_requests_form_id_fkey(title)').eq('player_id',auth.data.user.id)
      .is('answered_at',null).order('sent_at',{ascending:false}).limit(12);
    if (result.error) throw result.error;
    return result.data;
  } catch (error) { unstable_rethrow(error); throw error; }
}
