'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { captainClient } from './client';
import { messages } from '../workspace/messages';
import { paymentMethodClient } from './payment-method-client';

export type HistoryCursor = { payments: number; collections: number };
export async function loadPaymentHistory(playerId: string, cursor: HistoryCursor) {
  const t = await getT(messages);
  const validCursor = z.object({ payments: z.number().int().min(0), collections: z.number().int().min(0) }).safeParse(cursor);
  if (!z.uuid().safeParse(playerId).success || !validCursor.success) throw new Error(t('failure'));
  try {
    const { client, captainId } = await captainClient();
    const [payments, collections] = await Promise.all([
      paymentMethodClient(client).from('player_payments').select('id,amount_egp,created_at,days,period_start,period_end,notes,price_egp,method')
        .eq('captain_id', captainId).eq('player_id', playerId).order('created_at', { ascending: false }).order('id').range(cursor.payments, cursor.payments + 50),
      paymentMethodClient(client).from('payment_collections').select('id,amount_egp,created_at,payment_id,method')
        .eq('captain_id', captainId).eq('player_id', playerId).order('created_at', { ascending: false }).order('id').range(cursor.collections, cursor.collections + 50),
    ]);
    if (payments.error || collections.error) throw new Error(t('failure'));
    const timeline = [...payments.data.map(p => ({ ...p, key: `p:${p.id}` })), ...collections.data.map(p => ({ ...p, key: `c:${p.id}` }))]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.key.localeCompare(b.key));
    const selected = new Set(timeline.slice(0, 50).map(row => row.key));
    const pagePayments = payments.data.filter(p => selected.has(`p:${p.id}`)), pageCollections = collections.data.filter(p => selected.has(`c:${p.id}`));
    return { payments: pagePayments, collections: pageCollections, more: timeline.length > 50,
      next: { payments: cursor.payments + pagePayments.length, collections: cursor.collections + pageCollections.length } };
  } catch (error) { unstable_rethrow(error); throw new Error(t('failure')); }
}
