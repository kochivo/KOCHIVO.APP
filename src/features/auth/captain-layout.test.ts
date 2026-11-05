import { beforeEach, expect, it, vi } from 'vitest';
import { captainApproval } from '@/features/roster';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), path: '/captain' }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc }) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-kochivo-path': mocks.path }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
beforeEach(() => { vi.resetAllMocks(); mocks.path = '/captain'; });
const row = { role: 'captain', role_confirmed: true, suspended_at: null, is_admin: false, captain_status: 'pending' };
it.each(['pending', 'rejected'])('blocks other captain screens while %s', async captain_status => {
  mocks.rpc.mockResolvedValue({ data: [{ ...row, captain_status }], error: null });
  await expect(captainApproval()).rejects.toThrow('redirect:/captain/pending');
  mocks.path = '/captain/pending';
  expect(await captainApproval()).toBe(captain_status);
});
it('returns approved captains home from the pending screen', async () => {
  mocks.path = '/captain/pending';
  mocks.rpc.mockResolvedValue({ data: [{ ...row, captain_status: 'approved' }], error: null });
  await expect(captainApproval()).rejects.toThrow('redirect:/captain');
});
it('fails closed without a profile and propagates database errors', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
  await expect(captainApproval()).rejects.toThrow('redirect:/login');
  mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('network') });
  await expect(captainApproval()).rejects.toThrow('network');
});
it('sends a signed-out caller to login instead of crashing after sign-out', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied' } });
  await expect(captainApproval()).rejects.toThrow('redirect:/login');
});
