'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { captainClient } from './client';
import { messages } from '../messages';
import { messages as durationMessages } from '../tiers/messages';
import type { CatalogPackage } from '../tiers/types';
import type { ActionResult } from '../types';

const inputSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(1).max(60),
  max_freeze_days: z.number().int().min(0).max(90).nullable().optional(),
  price: z.number().int().min(0).max(100000), days: z.number().int().min(1).max(365),
  kind: z.enum(['days', 'sessions']), sessions: z.number().int().min(1).max(200).nullable(), tier_id: z.uuid().nullable(),
}).strict().refine(value => value.kind !== 'sessions' || value.sessions !== null);

export async function saveCatalogPackage(input: unknown): Promise<ActionResult<CatalogPackage>> {
  const t = await getT(messages), parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: t('packageInvalid') };
  try {
    const { client, captainId } = await captainClient();
    const { id, price, ...fields } = parsed.data;
    if (fields.tier_id) {
      const length = fields.kind === 'days' ? fields.days : fields.sessions;
      if (length === null) return { error: t('packageInvalid') };
      let duplicate = client.from('captain_packages').select('id').eq('captain_id', captainId)
        .eq('tier_id', fields.tier_id).is('archived_at', null).eq('kind', fields.kind)
        .eq(fields.kind === 'days' ? 'days' : 'sessions', length);
      if (id) duplicate = duplicate.neq('id', id);
      const existing = await duplicate;
      if (existing.error) throw existing.error;
      if (existing.data.length) return { error: (await getT(durationMessages))('duplicateDuration') };
    }
    const table = client.from('captain_packages');
    const row = { ...fields, price_egp: price };
    const query = id ? table.update(row).eq('id', id).eq('captain_id', captainId)
      : table.insert({ ...row, id: uuidv7(), captain_id: captainId });
    const result = await query.select('id,name,price_egp,days,kind,sessions,tier_id,max_freeze_days').single();
    if (result.error) throw result.error;
    revalidatePath('/captain/billing');
    revalidatePath('/c/[slug]', 'page');
    return { data: { ...result.data, kind: result.data.kind === 'sessions' ? 'sessions' : 'days' } };
  } catch (error) { unstable_rethrow(error); return { error: t('packageFailed') }; }
}
