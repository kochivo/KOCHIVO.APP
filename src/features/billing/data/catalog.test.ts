import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveOffer, saveTier, setOfferPaused, setTierArchived, assignPackageTier, deleteArchivedTier } from './catalog-actions';
import { fetchPackageCatalog, fetchPlayerTier } from './catalog-read';
import { activatePlayerWithOffer, renewPlayerWithOffer } from './offer-sales';

const fake = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), query: vi.fn(), writes: [] as unknown[], error: null as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ captainClient: async () => ({ client: { from: fake.from, rpc: fake.rpc }, captainId: 'captain' }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ from: fake.from, rpc: fake.rpc }) }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const id = '01900000-0000-7000-8000-000000000206';
const tier = { name: 'VIP', description: '', color: 'lime', position: 0, features: ['Weekly call'], is_featured: true };
const offer = { name: 'Sale', kind: 'percent', value: 20, scope: 'all', tier_ids: [], package_ids: [],
  starts_at: '2026-11-12T12:00:00Z', ends_at: '2026-11-13T12:00:00Z', for_new: true, for_renewals: true, max_uses: null };
beforeEach(() => {
  vi.clearAllMocks(); fake.writes = []; fake.error = null;
  fake.rpc.mockResolvedValue({ data: [{ id, name: 'VIP' }], error: null });
  fake.from.mockImplementation((table: string) => {
    const result = { data: table === 'captain_offers' ? [] : [{ id }], error: fake.error };
    const chain = {
      select: () => chain, eq: () => chain, is: () => chain, order: () => chain, lte: () => chain, gt: () => chain,
      insert: (row: unknown) => { fake.writes.push(row); return chain; },
      update: (row: unknown) => { fake.writes.push(row); return chain; },
      single: async () => ({ data: { id, ...fake.writes.at(-1) as object }, error: fake.error }),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());
it('reports a history refusal from the atomic delete operation and accepts a successful delete', async () => {
  fake.rpc.mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
  expect(await deleteArchivedTier(id)).toEqual({ error: 'deleteTierBlocked' });
  expect(await deleteArchivedTier(id)).toEqual({ data: true });
  expect(fake.rpc).toHaveBeenCalledWith('delete_archived_package_tier', { p_tier: id });
});
it('omits archived tier durations from workspace public choices while retaining captain access', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const packages = [{ id: 'active', tier_id: id }, { id: 'archived', tier_id: 'old' }];
  fake.from.mockImplementation((table: string) => {
    const data = table === 'captain_packages' ? packages : table === 'captain_package_tiers' ? [{ id }] : [];
    const chain = { select: () => chain, eq: () => chain, is: () => chain, order: () => chain,
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
    return chain;
  });
  expect((await fetchPackageCatalog('captain')).packages.map(row => row.id)).toEqual(['active']);
  expect((await fetchPackageCatalog('captain', true)).packages.map(row => row.id)).toEqual(['active', 'archived']);
});
it('validates tier tokens, features and untrusted ownership before writing', async () => {
  for (const patch of [{ color: '#ffffff' }, { features: Array(11).fill('Feature') }, { captain_id: 'other' }, { name: '' }]) {
    expect(await saveTier({ ...tier, ...patch })).toEqual({ error: 'packageInvalid' });
  }
  expect(fake.writes).toEqual([]);
  const result = await saveTier(tier);
  expect(result.data).toMatchObject({ captain_id: 'captain', name: 'VIP', features: ['Weekly call'] });
  expect(result.data?.id).toMatch(/^[\da-f-]{14}7/);
});
it('validates dates, limits, eligibility, scopes and server-owned counters', async () => {
  for (const patch of [{ value: 91 }, { ends_at: offer.starts_at }, { for_new: false, for_renewals: false },
    { scope: 'tiers' }, { used_count: 0 }, { max_uses: 0 }, { kind: 'bonus_days', value: 1.5 }]) {
    expect(await saveOffer({ ...offer, ...patch })).toEqual({ error: 'packageInvalid' });
  }
  expect(fake.writes).toEqual([]);
  expect((await saveOffer(offer)).data).toMatchObject({ captain_id: 'captain', kind: 'percent' });
});
it('edits existing rows, pauses, archives and assigns packages using the owning captain', async () => {
  expect((await saveTier({ id, ...tier })).data).toMatchObject({ id, name: 'VIP' });
  expect((await saveOffer({ id, ...offer })).data).toMatchObject({ id, kind: 'percent' });
  const now = new Date('2026-11-12T12:00:00Z');
  await setOfferPaused(id, true, now); await setTierArchived(id, true, now); await assignPackageTier(id, id);
  expect(fake.writes.slice(-3)).toEqual([{ paused_at: now.toISOString() }, { archived_at: now.toISOString() }, { tier_id: id }]);
  expect(await setOfferPaused(id, true, 'invalid' as unknown as Date)).toEqual({ error: 'packageInvalid' });
  expect(await setTierArchived(id, true, 'invalid' as unknown as Date)).toEqual({ error: 'packageInvalid' });
});
it('returns read and write failures rather than false empty or success states', async () => {
  fake.error = { code: '42501' };
  expect(await saveTier(tier)).toEqual({ error: 'denied' });
  await expect(fetchPackageCatalog('captain')).rejects.toEqual(fake.error);
  fake.rpc.mockResolvedValue({ error: fake.error, data: null });
  await expect(fetchPlayerTier(id)).rejects.toEqual(fake.error);
});
it('returns empty catalog lists and a null current tier without fabricating a tier', async () => {
  expect(await fetchPackageCatalog('captain')).toMatchObject({ offers: [] });
  fake.rpc.mockResolvedValue({ error: null, data: [] });
  expect(await fetchPlayerTier(id)).toBeNull();
});
it('validates sale references and routes offer selection through atomic RPCs', async () => {
  expect(await renewPlayerWithOffer({ playerId: 'invalid', offerId: id, packageId: id })).toEqual({ error: 'invalid' });
  expect(fake.rpc).not.toHaveBeenCalled();
  fake.rpc.mockResolvedValue({ data: '2026-12-12', error: null });
  expect(await renewPlayerWithOffer({ playerId: id, offerId: id, packageId: id, amount: 100 })).toEqual({ data: '2026-12-12' });
  expect(fake.rpc).toHaveBeenLastCalledWith('renew_player_offer', { p_player: id, p_offer: id, p_package: id, p_amount: 100 });
  fake.rpc.mockResolvedValue({ data: null, error: null });
  expect(await activatePlayerWithOffer({ linkId: id, offerId: id, packageId: id, kind: 'days', quantity: 30, price: 1500, paid: 100 }))
    .toEqual({ data: true });
  fake.rpc.mockResolvedValue({ data: null, error: { code: 'P0206' } });
  expect(await renewPlayerWithOffer({ playerId: id, offerId: id, packageId: id })).toEqual({ error: 'renewFailed' });
});
