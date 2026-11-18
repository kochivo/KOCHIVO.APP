import { beforeEach, expect, it, vi } from 'vitest';
import { fetchCaptainResults } from './captain-results';
import { exportCaptainResults } from './export-captain-results';
import { fetchCaptains } from './captains';
import { fetchCaptainActivity } from './dashboard';
import type { CaptainRow } from '../types';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('./captains', () => ({ fetchCaptains: vi.fn() }));
vi.mock('./dashboard', () => ({ fetchCaptainActivity: vi.fn() }));

const rows: CaptainRow[] = Array.from({ length: 103 }, (_, index) => ({
  id: String(index), full_name: `Coach ${index}`, email: null, tier: index < 100 ? 'entry' : 'legend',
  email_confirmed: true, created_at: '2026-11-01T10:00:00Z', tier_ends_at: null, active_players: 0,
  player_limit: 5, suspended: false, last_paid_tier: null, last_paid_ends_at: null, over_limit: false,
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchCaptains).mockImplementation(async ({ offset = 0, limit = 100 } = {}) => ({
    rows: rows.slice(offset, offset + limit), error: null,
  }));
  vi.mocked(fetchCaptainActivity).mockImplementation(async ids => ({
    data: ids.map(id => ({ id, lastActiveAt: null, quiet: Number(id) >= 101, expiringSoon: false })), error: null,
  }));
});

it('paginates matches after filtering across RPC batches', async () => {
  const params = { search: 'Coach', filter: 'paid', limit: 2 } as const;
  expect(await fetchCaptainResults(params)).toMatchObject({ rows: rows.slice(100, 102), hasNext: true });
  expect(fetchCaptains).toHaveBeenCalledWith({ search: 'Coach', offset: 100, limit: 100 });
  expect(await fetchCaptainResults({ ...params, offset: 2 })).toMatchObject({ rows: rows.slice(102), hasNext: false });
});

it('exports every matching captain while keeping the search scope', async () => {
  const result = await exportCaptainResults('Coach', 'quiet');
  expect(result.csv).toContain('"Coach 101"');
  expect(result.csv).toContain('"Coach 102"');
  expect(result.csv).not.toContain('"Coach 100"');
  expect(fetchCaptains).toHaveBeenCalledWith({ search: 'Coach', offset: 0, limit: 100 });
});

it('reports failed activity reads without claiming there are no matches', async () => {
  vi.mocked(fetchCaptainActivity).mockResolvedValue({ data: null, error: 'Unavailable' });
  expect(await fetchCaptainResults({ search: '', filter: 'quiet', limit: 100 })).toMatchObject({ activityError: true, rows: [] });
  expect(await fetchCaptainResults({ search: '', filter: 'paid', limit: 100 })).toMatchObject({ activityError: true, rows: rows.slice(100) });
  expect(await exportCaptainResults('', 'paid')).toEqual({ error: 'activity' });
});
