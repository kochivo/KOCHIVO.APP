import { afterEach, expect, it, vi } from 'vitest';
import { loadHallOfFame } from './data/load-hall-of-fame';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc }) }));
afterEach(() => rpc.mockReset());
const row = { month: '2026-10-01', player_id: null, display_name: 'Mona', adherence: 50, done: 4, planned: 8 };

it('loads frozen team history including masked ids and empty results', async () => {
  rpc.mockResolvedValue({ data: [row], error: null });
  expect(await loadHallOfFame()).toEqual([row]);
  expect(rpc).toHaveBeenCalledWith('crown_hall_of_fame');
  rpc.mockResolvedValue({ data: [], error: null });
  expect(await loadHallOfFame()).toEqual([]);
});

it('rejects RPC failures and malformed or unqualified history', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('offline') });
  await expect(loadHallOfFame()).rejects.toThrow('offline');
  for (const data of [null, [{ ...row, month: '2026-10-02' }], [{ ...row, adherence: 0 }],
    [{ ...row, player_id: 'invalid' }], [{ ...row, done: 3 }], [{ ...row, planned: 7 }], Array(13).fill(row)]) {
    rpc.mockResolvedValue({ data, error: null });
    await expect(loadHallOfFame()).rejects.toThrow();
  }
});
