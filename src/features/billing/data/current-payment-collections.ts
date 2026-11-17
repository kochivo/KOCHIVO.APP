import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { PaymentMethod } from '../payment-methods';
import { paymentMethodClient } from './payment-method-client';

export async function currentPaymentCollections(client: SupabaseClient<AppDatabase>, captainId: string, ids: string[]) {
  const totals = new Map<string, { collected_egp: number; collection_method: PaymentMethod | null }>();
  for (let chunk = 0; chunk < ids.length; chunk += 100) {
    for (let offset = 0; ; offset += 500) {
      const page = await paymentMethodClient(client).from('payment_collections').select('payment_id,amount_egp,method')
        .eq('captain_id', captainId).in('payment_id', ids.slice(chunk, chunk + 100))
        .order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (page.error) throw page.error;
      for (const row of page.data) {
        const previous = totals.get(row.payment_id);
        totals.set(row.payment_id, { collected_egp: (previous?.collected_egp ?? 0) + row.amount_egp,
          collection_method: previous ? previous.collection_method : row.method });
      }
      if (page.data.length < 500) break;
    }
  }
  return totals;
}
