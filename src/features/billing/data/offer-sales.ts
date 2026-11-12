'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getT } from '@/core/i18n/server';
import { isPermissionDenied } from '@/core/supabase/errors';
import { messages } from '../messages';
import type { ActionResult } from '../types';
import { captainClient } from './client';
import { catalogRpc } from './catalog-rpc';

const money = z.number().int().min(0).max(100000);
const renewal = z.object({ playerId: z.uuid(), offerId: z.uuid(), packageId: z.uuid(), amount: money.optional() }).strict();
const activation = z.object({ linkId: z.uuid(), offerId: z.uuid(), packageId: z.uuid(),
  kind: z.enum(['days', 'sessions']), quantity: z.number().int().min(1).max(365), price: money, paid: money,
}).strict().refine(v => v.paid <= v.price && (v.kind !== 'sessions' || v.quantity <= 200));

async function failure(error: unknown) {
  unstable_rethrow(error);
  const t = await getT(messages);
  return { error: t(isPermissionDenied(error) ? 'denied' : 'renewFailed') };
}
function refresh() {
  revalidatePath('/captain/billing'); revalidatePath('/captain/players'); revalidatePath('/player');
  revalidatePath('/c/[slug]', 'page');
}

export async function renewPlayerWithOffer(input: unknown): Promise<ActionResult<string>> {
  const parsed = renewal.safeParse(input);
  if (!parsed.success) return { error: (await getT(messages))('invalid') };
  try {
    const { client } = await captainClient();
    const v = parsed.data;
    const result = await catalogRpc(client)('renew_player_offer', { p_player: v.playerId, p_offer: v.offerId,
      p_package: v.packageId, ...(v.amount === undefined ? {} : { p_amount: v.amount }) });
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Renewal returned no end date');
    refresh(); return { data: result.data };
  } catch (error) { return failure(error); }
}

export async function activatePlayerWithOffer(input: unknown): Promise<ActionResult<true>> {
  const parsed = activation.safeParse(input);
  if (!parsed.success) return { error: (await getT(messages))('invalid') };
  try {
    const { client } = await captainClient();
    const v = parsed.data;
    const result = await catalogRpc(client)('activate_player_offer', { p_link: v.linkId, p_offer: v.offerId,
      p_package: v.packageId, p_kind: v.kind, p_quantity: v.quantity, p_price_egp: v.price, p_paid_egp: v.paid, p_free_trial: false });
    if (result.error) throw result.error;
    refresh(); return { data: true };
  } catch (error) { return failure(error); }
}
