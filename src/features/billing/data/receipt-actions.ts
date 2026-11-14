'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/core/supabase/server';
import { getT } from '@/core/i18n/server';
import { signedMediaUrl } from '@/core/storage/private-media';
import { messages } from '../receipts/messages';
import { receiptMethods } from '../receipts/types';
import { receiptClient } from './receipt-client';
import { captainClient } from './client';
import { fetchPendingPaymentReceipts } from './receipt-read';

const submission = z.object({ id: z.uuid(), captainId: z.uuid(), amount: z.number().int().min(1).max(100000),
  method: z.enum(receiptMethods).nullable(), photo: z.string().max(160), renewalId: z.uuid().nullable() }).strict();
const decision = z.object({ id: z.uuid(), photo: z.string().max(160), revision: z.number().int().positive(), days: z.number().int().min(1).max(365).nullable(),
  reason: z.string().trim().min(1).max(200).regex(/^[^\r\n]+$/).optional() }).strict();
async function failure(error: unknown) {
  unstable_rethrow(error);
  return { error: (await getT(messages))('error'), data: undefined };
}
function refresh() {
  revalidatePath('/[locale]/captain/billing', 'page');
  revalidatePath('/[locale]/captain/queue', 'page');
  revalidatePath('/[locale]/player', 'layout');
}
export async function loadPlayerReceipt() {
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Player required');
    const playerId = auth.data.user.id;
    const link = await client.from('coach_clients').select('captain_id').eq('player_id', playerId).eq('pending', false).is('archived_at', null).single();
    if (link.error) throw link.error;
    const receipt = await receiptClient(client).from('payment_receipts').select('*').eq('player_id', playerId)
      .eq('captain_id', link.data.captain_id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
    if (receipt.error) throw receipt.error;
    return { data: { playerId, captainId: link.data.captain_id, receipt: receipt.data }, error: undefined };
  } catch (error) { return failure(error); }
}
export async function submitPaymentReceipt(input: unknown) {
  try {
    const v = submission.parse(input), client = receiptClient(await supabaseServer());
    const result = await client.rpc('submit_payment_receipt', { p_id: v.id, p_captain: v.captainId, p_amount: v.amount,
      p_method: v.method, p_photo: v.photo, p_renewal: v.renewalId });
    if (result.error) throw result.error;
    refresh(); return { data: result.data, error: undefined };
  } catch (error) { return failure(error); }
}
export async function listPaymentReceipts() {
  try {
    const rows = await fetchPendingPaymentReceipts();
    const { client } = await captainClient();
    const data = await Promise.all(rows.map(async row => {
      const [profile, url, request] = await Promise.all([
        client.from('profiles').select('full_name').eq('id', row.player_id).single(),
        signedMediaUrl(client, 'payment-receipts', row.photo_path),
        row.renewal_request_id ? client.from('player_renewal_requests').select('package_id').eq('id', row.renewal_request_id).single() : null,
      ]);
      if (profile.error || request?.error) throw profile.error ?? request?.error;
      const pkg = request?.data ? await client.from('captain_packages').select('name').eq('id', request.data.package_id).single() : null;
      if (pkg?.error) throw pkg.error;
      return { ...row, name: profile.data.full_name, url, packageName: pkg?.data?.name ?? null };
    }));
    return { data, error: undefined };
  } catch (error) { return failure(error); }
}
export async function decidePaymentReceipt(input: unknown) {
  try {
    const v = decision.parse(input), { client } = await captainClient();
    const result = v.reason === undefined
      ? await receiptClient(client).rpc('accept_payment_receipt', { p_receipt: v.id, p_days: v.days, p_package: null,
        p_message: (await getT(messages))('confirmation'), p_photo: v.photo, p_revision: v.revision })
      : await receiptClient(client).rpc('decline_payment_receipt', { p_receipt: v.id, p_reason: v.reason, p_photo: v.photo, p_revision: v.revision });
    if (result.error) throw result.error;
    refresh(); return { data: true, error: undefined };
  } catch (error) { return failure(error); }
}
