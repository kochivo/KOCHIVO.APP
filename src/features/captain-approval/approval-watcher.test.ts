import { beforeEach, expect, it, vi } from 'vitest';
import { approvedNow } from './components/approval-watcher';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc }) }));
beforeEach(() => { rpc.mockReset(); });

it.each([
  [{ data: [{ captain_status: 'approved' }], error: null }, true],
  [{ data: [{ captain_status: 'pending' }], error: null }, false],
  [{ data: [{ captain_status: 'rejected' }], error: null }, false],
  [{ data: [], error: null }, false],
])('opens the app only once the captain is approved', async (result, expected) => {
  rpc.mockResolvedValue(result);
  expect(await approvedNow()).toBe(expected);
  expect(rpc).toHaveBeenCalledWith('my_approval_route_profile');
});

it('reports an RPC error separately from a pending approval', async () => {
  const error = { code: '42501' };
  rpc.mockResolvedValue({ data: null, error });
  await expect(approvedNow()).rejects.toEqual(error);
});

it('reports a rejected request as a failed check', async () => {
  const error = new Error('offline');
  rpc.mockImplementation(async () => { throw error; });
  await expect(approvedNow()).rejects.toBe(error);
});
