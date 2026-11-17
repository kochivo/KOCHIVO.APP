import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { currentPaymentCollections } from './current-payment-collections';

vi.mock('server-only', () => ({}));

function database(fail = false) {
  const filters: unknown[][] = [];
  const query = {
    select: (columns: string) => { filters.push(['select', columns]); return query; },
    eq: (column: string, value: string) => { filters.push(['eq', column, value]); return query; },
    in: (column: string, values: string[]) => { filters.push(['in', column, values]); return query; },
    order: (column: string) => { filters.push(['order', column]); return query; },
    range: async (start: number, end: number) => {
      filters.push(['range', start, end]);
      return { error: fail ? new Error('Unavailable') : null,
        data: start === 0 ? Array.from({ length: 500 }, () => ({ payment_id: 'current', amount_egp: 1, method: 'cash' }))
          : [{ payment_id: 'current', amount_egp: 50, method: 'instapay' },
            { payment_id: 'second', amount_egp: 100, method: null }] };
    },
  };
  const client = { from: (table: string) => { filters.push(['from', table]); return query; } } as unknown as SupabaseClient<AppDatabase>;
  return { client, filters };
}
it('loads every page of collections for the captain and current renewal ids without a revenue date cutoff', async () => {
  const { client, filters } = database();
  const totals = await currentPaymentCollections(client, 'captain', ['current', 'second']);
  expect(totals.get('current')).toEqual({ collected_egp: 550, collection_method: 'cash' });
  expect(totals.get('second')).toEqual({ collected_egp: 100, collection_method: null });
  expect(filters).toContainEqual(['eq', 'captain_id', 'captain']);
  expect(filters).toContainEqual(['in', 'payment_id', ['current', 'second']]);
  expect(filters).toContainEqual(['range', 0, 499]);
  expect(filters).toContainEqual(['range', 500, 999]);
});
it('fails instead of reporting a misleading unpaid total when collections cannot load', async () => {
  const { client } = database(true);
  await expect(currentPaymentCollections(client, 'captain', ['current'])).rejects.toThrow('Unavailable');
});
it('makes no collection request without a renewal', async () => {
  const { client, filters } = database();
  expect(await currentPaymentCollections(client, 'captain', [])).toEqual(new Map());
  expect(filters).toEqual([]);
});
