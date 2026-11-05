import { beforeEach, expect, it, vi } from 'vitest';
import { fetchPendingCaptains, reviewCaptain } from './data/captain-reviews';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), revalidate: vi.fn(), rethrow: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'en' }) }) }));
vi.mock('./data/require-admin', () => ({ requireAdmin: async () => ({ rpc: mocks.rpc }) }));
vi.mock('next/navigation', () => ({ unstable_rethrow: mocks.rethrow }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
const captain = '01900000-0000-7000-8000-000000000001';
beforeEach(() => { vi.resetAllMocks(); mocks.rpc.mockResolvedValue({ data: [], error: null }); });
it('loads pending captains through the admin RPC', async () => {
  expect(await fetchPendingCaptains()).toEqual({ rows: [], error: null });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_pending_captains');
});
it.each(['approved', 'rejected'])('reviews %s and refreshes admin', async status => {
  expect(await reviewCaptain({ captain, status })).toEqual({ success: true });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('admin_review_captain', { p_captain: captain, p_status: status });
  expect(mocks.revalidate).toHaveBeenCalledWith('/admin');
});
it('validates ids and statuses before writing', async () => {
  expect(await reviewCaptain({ captain: 'bad', status: 'approved' })).toHaveProperty('error');
  expect(await reviewCaptain({ captain, status: 'pending' })).toHaveProperty('error');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('returns safe errors for RPC and transport failures without refreshing', async () => {
  mocks.rpc.mockResolvedValueOnce({ error: { message: 'private' } });
  expect(await reviewCaptain({ captain, status: 'approved' })).toHaveProperty('error');
  mocks.rpc.mockRejectedValueOnce(new Error('network'));
  expect(await fetchPendingCaptains()).toMatchObject({ rows: [], error: expect.any(String) });
  expect(mocks.rethrow).toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
