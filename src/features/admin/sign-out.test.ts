import { beforeEach, expect, it, vi } from 'vitest';
import { signOutAdmin } from './data/sign-out';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), redirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth: { signOut: mocks.signOut } }) }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => () => 'Action failed. Try again' }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
beforeEach(() => { vi.clearAllMocks(); });

it('signs out on the server before redirecting to login', async () => {
  mocks.signOut.mockResolvedValue({ error: null });
  await signOutAdmin();
  expect(mocks.signOut).toHaveBeenCalledOnce();
  expect(mocks.redirect).toHaveBeenCalledWith('/login');
  expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0] ?? 0);
});

it('reports a translated failure without redirecting when sign-out fails', async () => {
  mocks.signOut.mockResolvedValue({ error: new Error('private failure') });
  await expect(signOutAdmin()).rejects.toThrow('Action failed. Try again');
  expect(mocks.redirect).not.toHaveBeenCalled();
});
