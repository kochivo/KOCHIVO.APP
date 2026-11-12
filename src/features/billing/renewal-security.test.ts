import { expect, it, vi } from 'vitest';
import { requestPlayerRenewal } from './data/renewal-requests';

const state = vi.hoisted(() => ({ server: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: state.server }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => () => 'Request failed' }));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./data/client', () => ({ captainClient: vi.fn() }));
vi.mock('./data/catalog-read', () => ({ fetchPackageCatalog: vi.fn() }));

it.each(['price', 'list_price_egp', 'tier_id'])('rejects a forged %s before reaching the database', async key => {
  const packageId = '01900000-0000-7000-8000-000000000208';
  expect(await requestPlayerRenewal({ packageId, offerId: null, [key]: 1 }))
    .toEqual({ error: 'Request failed' });
  expect(state.server).not.toHaveBeenCalled();
});
