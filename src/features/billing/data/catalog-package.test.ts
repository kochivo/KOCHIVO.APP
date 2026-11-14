import { beforeEach, expect, it, vi } from 'vitest';
import { saveCatalogPackage } from './catalog-package';
import { loadTiersWorkspace } from './tiers-workspace';
import { catalogFixture } from '../tiers/catalog-fixture';

const state = vi.hoisted(() => ({ failure: false, existing: [] as Record<string, unknown>[], row: { id: '01900000-0000-7000-8000-000000000207', captain_id: 'owner',
  name: 'PT', price_egp: 1000, days: 30, kind: 'sessions', sessions: 12, tier_id: null as string | null } }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
vi.mock('./catalog-read', () => ({ fetchCaptainPackageCatalog: async () => catalogFixture }));
vi.mock('./client', () => ({ captainClient: async () => ({ captainId: 'owner', client: {
  rpc: async () => ({ data: [{ id: 'last' }], error: null }),
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    let excluded: unknown;
    let patch: Record<string, unknown> = {};
    const chain = {
      eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      is: (key: string, value: unknown) => { filters[key] = value; return chain; },
      neq: (_key: string, value: unknown) => { excluded = value; return chain; },
      in: () => chain, select: () => chain,
      insert: (row: Record<string, unknown>) => { patch = row; return chain; },
      update: (row: Record<string, unknown>) => { patch = row; return chain; },
      single: async () => {
        if (state.failure || table === 'captain_packages' && filters.id && (filters.id !== state.row.id || filters.captain_id !== state.row.captain_id)) return { data: null, error: new Error('denied') };
        if (table === 'profiles') return { data: { public_slug: 'ali' }, error: null };
        Object.assign(state.row, patch);
        return { data: state.row, error: null };
      },
      then: (done: (value: unknown) => unknown) => Promise.resolve({ data: table === 'captain_packages'
        ? state.existing.filter(row => row.id !== excluded && Object.entries(filters).every(([key, value]) => row[key] === value))
        : [{ tier_id: 'vip', package_id: 'month' }, { tier_id: null, package_id: 'quarter' }], error: state.failure ? new Error('offline') : null }).then(done),
    };
    return chain;
  },
} }) }));
const input = { name: 'PT', price: 1500, days: 60, kind: 'sessions', sessions: 10, tier_id: '01900000-0000-7000-8000-000000000208' };
beforeEach(() => { state.failure = false; state.existing = []; vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); });
it.each(['days', 'sessions'])('rejects another active %s package of the same length before writing', async kind => {
  state.existing = [{ ...input, id: 'duplicate', captain_id: 'owner', archived_at: null, kind }];
  expect(await saveCatalogPackage({ ...input, kind })).toEqual({ error: 'duplicateDuration' });
});
it.each([{ archived_at: '2026-01-01' }, { captain_id: 'other' }, { tier_id: 'other' }, { sessions: 11 }, { kind: 'days' }])('allows unrelated durations %j', async patch => {
  state.existing = [{ ...input, id: 'duplicate', captain_id: 'owner', archived_at: null, ...patch }];
  expect((await saveCatalogPackage(input)).error).toBeUndefined();
});
it('excludes the edited package and fails closed when the duplicate lookup fails', async () => {
  state.existing = [{ ...input, id: state.row.id, captain_id: 'owner', archived_at: null }];
  expect((await saveCatalogPackage({ ...input, id: state.row.id })).error).toBeUndefined();
  state.failure = true;
  expect(await saveCatalogPackage(input)).toEqual({ error: 'packageFailed' });
});
it('edits package values and tier together while retaining session fields', async () => {
  const result = await saveCatalogPackage({ ...input, id: state.row.id });
  expect(result.data).toMatchObject({ name: 'PT', days: 60, price_egp: 1500, sessions: 10, tier_id: input.tier_id });
});
it('does not edit a package outside the current captain ownership filter', async () => {
  state.row.captain_id = 'other';
  try { expect(await saveCatalogPackage({ ...input, id: state.row.id })).toEqual({ error: 'packageFailed' }); }
  finally { state.row.captain_id = 'owner'; }
});
it.each([{ sessions: null }, { price: -1 }, { days: 0 }, { captain_id: 'other' }, { tier_id: 'invalid' }])('rejects invalid package input %j', async patch => {
  expect(await saveCatalogPackage({ ...input, ...patch })).toEqual({ error: 'packageInvalid' });
});
it('loads player counts and public slug alongside the existing catalog', async () => {
  const result = await loadTiersWorkspace();
  expect(result.data?.counts).toEqual({ vip: 2 });
  expect(result.data?.publicSlug).toBe('ali');
  expect(result.data?.tiers[0]?.features).toEqual(['Weekly call']);
});
it('returns load failures and gates the new workspace off', async () => {
  state.failure = true;
  expect(await loadTiersWorkspace()).toEqual({ error: 'loadFailed' });
  state.failure = false; vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(await loadTiersWorkspace()).toEqual({ error: 'loadFailed' });
});
