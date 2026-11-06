import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getT } from '@/core/i18n/server';
import { localDate } from '@/lib/dates';
import { rosterClient } from './client';
import { playerInviteSchema } from '../invite-schema';
import { messages } from '../invites/messages';

export async function createPlayerInviteAt(input: unknown, now: Date): Promise<{ code: string } | { error: string }> {
  const t = await getT(messages);
  const parsed = playerInviteSchema(localDate(now)).safeParse(input);
  if (!parsed.success) return { error: t('invalid') };
  try {
    const client = await rosterClient();
    const v = parsed.data;
    const result = await client.rpc('create_player_invite', { p_name: v.name, p_whatsapp: v.whatsapp ?? null,
      p_package: v.packageId, p_kind: v.kind, p_quantity: v.quantity, p_price_egp: v.price,
      p_paid_egp: v.paid, p_free_trial: v.freeTrial, p_starts_on: v.startsOn });
    if (result.error) {
      const code = result.error.code;
      const key = code === 'P0001' ? 'playerLimit' : code === 'P0002' ? 'packageMissing'
        : code === '22023' || code === '23514' ? 'invalid' : code === '42501' ? 'captainRequired' : 'failed';
      return { error: t(key) };
    }
    if (!result.data) return { error: t('failed') };
    revalidatePath('/captain/players'); revalidatePath('/captain/billing');
    return { code: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('failed') }; }
}
