'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import { captainClient } from './client';
import type { ActionResult, Package } from '../types';

const packageInput = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.number().int().min(0).max(100000),
  days: z.number().int().min(1).max(365),
}).strict();
const archiveInput = z.object({ id: z.uuid() }).strict();
const collectInput = z.object({ playerId: z.uuid(), amount: z.number().int().min(1).max(100000) }).strict();

async function failure(error: unknown, fallback: string): Promise<{ error: string }> {
  const t = await getT(messages);
  if (isPermissionDenied(error)) return { error: t('denied') };
  if (readError(error).code === '22023') return { error: t('collectTooMuch') };
  console.error('Finance action failed', error);
  return { error: fallback };
}

export async function createPackage(input: unknown): Promise<ActionResult<Package>> {
  const t = await getT(messages);
  const parsed = packageInput.safeParse(input);
  if (!parsed.success) return { error: t('packageInvalid') };
  try {
    const { client, captainId } = await captainClient();
    const { name, price, days } = parsed.data;
    const result = await client.from('captain_packages').insert({ captain_id: captainId, name, price_egp: price, days })
      .select('id, name, price_egp, days').single();
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    return { data: result.data };
  } catch (error) { return failure(error, t('packageFailed')); }
}

export async function archivePackage(input: unknown): Promise<ActionResult<true>> {
  const t = await getT(messages);
  const parsed = archiveInput.safeParse(input);
  if (!parsed.success) return { error: t('packageFailed') };
  try {
    const { client, captainId } = await captainClient();
    const result = await client.from('captain_packages').update({ archived_at: new Date().toISOString() })
      .eq('id', parsed.data.id).eq('captain_id', captainId).select('id').single();
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    return { data: true };
  } catch (error) { return failure(error, t('packageFailed')); }
}

/** Returns what the player still owes after this installment. */
export async function collectPayment(input: unknown): Promise<ActionResult<number>> {
  const t = await getT(messages);
  const parsed = collectInput.safeParse(input);
  if (!parsed.success) return { error: t('amountHint') };
  try {
    const { client } = await captainClient();
    const result = await client.rpc('collect_player_payment', { p_player: parsed.data.playerId, p_amount: parsed.data.amount });
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    return { data: result.data };
  } catch (error) { return failure(error, t('collectFailed')); }
}
