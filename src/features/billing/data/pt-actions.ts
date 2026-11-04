'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { captainClient } from './client';
import { messages } from '../packages/messages';
import type { Activation, PlayerBalance } from '../pt-types';
import type { ActionResult, Package } from '../types';

const activation = z.object({ packageId: z.uuid().nullable(), kind: z.enum(['days', 'sessions']),
  quantity: z.number().int().min(1).max(365), price: z.number().int().min(0).max(100000),
  paid: z.number().int().min(0).max(100000), freeTrial: z.boolean(),
}).refine(v => v.paid <= v.price && (v.kind !== 'sessions' || v.quantity <= 200));

export async function loadPlayerBalance(playerId: string): Promise<ActionResult<{ balance: PlayerBalance; packages: Package[] }>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success) return { error: t('error') };
  try {
    const { client, captainId } = await captainClient();
    const [link, packages] = await Promise.all([
      client.from('coach_clients').select('id,access_until,sessions_left,frozen_at,pending')
        .eq('player_id', playerId).eq('captain_id', captainId).is('archived_at', null).single(),
      client.from('captain_packages').select('id,name,days,price_egp,kind,sessions')
        .eq('captain_id', captainId).is('archived_at', null).order('created_at'),
    ]);
    if (link.error || packages.error || !link.data) throw link.error ?? packages.error;
    return { data: { balance: link.data, packages: packages.data ?? [] } };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}

export async function activatePlayer(link: string, input: Activation): Promise<ActionResult<true>> {
  const t = await getT(messages);
  const parsed = activation.safeParse(input);
  if (!z.uuid().safeParse(link).success || !parsed.success) return { error: t('error') };
  try {
    const { client } = await captainClient();
    const v = parsed.data;
    const result = await client.rpc('activate_player', { p_link: link, p_package: v.packageId, p_kind: v.kind,
      p_quantity: v.quantity, p_price_egp: v.price, p_paid_egp: v.paid, p_free_trial: v.freeTrial });
    if (result.error) throw result.error;
    revalidatePath('/captain/players'); revalidatePath('/captain/billing'); revalidatePath('/player');
    return { data: true };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}

export async function setPlayerFrozen(link: string, frozen: boolean): Promise<ActionResult<true>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(link).success || typeof frozen !== 'boolean') return { error: t('error') };
  try {
    const { client } = await captainClient();
    const result = await client.rpc('set_player_frozen', { p_link: link, p_frozen: frozen });
    if (result.error) throw result.error;
    revalidatePath('/captain/players'); revalidatePath('/captain/billing'); revalidatePath('/player');
    return { data: true };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
