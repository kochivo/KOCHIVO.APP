import { beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { WelcomeScreen } from './components/welcome-screen-entry';
import { InstalledLoginRedirect } from './components/installed-login-redirect-entry';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), rpc: vi.fn(), redirect: vi.fn(), replace: vi.fn(),
  effect: undefined as (() => void) | undefined }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/claims', () => ({ currentClaims: mocks.claims }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc }) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useEffect: (effect: () => void) => { mocks.effect = effect; } }));

beforeEach(() => {
  vi.clearAllMocks(); mocks.effect = undefined;
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'user' } }, error: null });
});
it.each([
  ['player', false, true, null, 'approved', '/player'],
  ['captain', false, true, null, 'approved', '/captain'],
  ['captain', false, true, null, 'pending', '/captain/pending'],
  ['player', true, true, null, 'approved', '/admin'],
  ['player', false, true, 'paused', 'approved', '/suspended'],
] as const)('sends a signed-in %s to the same home as login', async (role, admin, confirmed, suspended, status, destination) => {
  mocks.rpc.mockResolvedValue({ data: [{ role, is_admin: admin, role_confirmed: confirmed, suspended_at: suspended, captain_status: status }] });
  await WelcomeScreen();
  expect(mocks.redirect).toHaveBeenCalledWith(destination);
});
it('lets guests open welcome in a normal browser', async () => {
  mocks.claims.mockResolvedValue({ data: { claims: null }, error: null });
  expect(await WelcomeScreen()).toBeDefined();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it('runs the compatibility replacement only for an unqualified installed login', () => {
  const win = { matchMedia: () => ({ matches: true }), navigator: {}, location: { search: '', replace: mocks.replace } };
  vi.stubGlobal('window', win);
  try {
    InstalledLoginRedirect(); mocks.effect?.();
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith('/welcome');
    for (const search of ['?tab=login', '?tab=signup', '?coach=', '?error=']) {
      mocks.replace.mockClear(); win.location.search = search;
      InstalledLoginRedirect(); mocks.effect?.();
      expect(mocks.replace).not.toHaveBeenCalled();
    }
  } finally { vi.unstubAllGlobals(); }
});
