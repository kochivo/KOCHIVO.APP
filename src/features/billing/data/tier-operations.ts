'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { captainClient } from './client';
import { saveTier, setTierArchived } from './catalog-actions';
import { messages } from '../tiers/messages';
import { tierFields, tierOperation } from '../tiers/tier-operations';
import type { ActionResult } from '../types';

export async function changeTierStatus(id: string, action: 'feature' | 'unfeature' | 'archive', now = new Date()): Promise<ActionResult<true>> {
  const t = await getT(messages), failure = t('failure');
  if (!z.uuid().safeParse(id).success || !['feature', 'unfeature', 'archive'].includes(action)) return { error: failure };
  try {
    const { client, captainId } = await captainClient();
    const columns = 'id,name,description,color,features,position,is_featured';
    const [target, previous] = await Promise.all([
      client.from('captain_package_tiers').select(columns).eq('captain_id', captainId).eq('id', id).is('archived_at', null).single(),
      client.from('captain_package_tiers').select(columns).eq('captain_id', captainId).eq('is_featured', true),
    ]);
    if (target.error || previous.error) throw target.error ?? previous.error;
    const updates = action === 'feature' ? previous.data.filter(row => row.id !== id).map(row => ({ before: row, after: { ...row, is_featured: false } }))
      : target.data.is_featured ? [{ before: target.data, after: { ...target.data, is_featured: false } }] : [];
    return await tierOperation(updates, saveTier, async () => {
      if (action === 'archive') return setTierArchived(id, true, now);
      const result = await saveTier({ ...tierFields(target.data), is_featured: action === 'feature' });
      return result.error !== undefined ? { error: result.error } : { data: true };
    }, failure);
  } catch (error) { unstable_rethrow(error); return { error: failure }; }
}
