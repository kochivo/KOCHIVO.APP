import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { decideRoute } from './routing';
import { refreshSession } from '@/core/supabase/session';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({
  auth: { getClaims: mocks.claims }, rpc: mocks.rpc, from: mocks.from,
}) }));
vi.mock('@/core/config/env', () => ({ publicEnv: () => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
}) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'caller' } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [{ role: 'player', role_confirmed: true, suspended_at: null, is_admin: false }], error: null });
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single: async () => ({
    data: { role: 'player', role_confirmed: true, suspended_at: null }, error: null,
  }) }) }) });
});

it.each([
  ['captain', false, false, '/captain', null],
  ['player', false, false, '/captain', '/player'],
  ['player', false, false, '/player', null],
  ['captain', false, false, '/player', '/captain'],
  ['captain', true, false, '/player', '/admin'],
  ['captain', true, false, '/admin', null],
  ['player', false, true, '/player', '/suspended'],
] as const)('routes %s with one DB call', async (role, admin, suspended, path, redirect) => {
  mocks.rpc.mockResolvedValue({ data: [{ role, role_confirmed: true,
    suspended_at: suspended ? '2026-11-03' : null, is_admin: admin }], error: null });
  const response = await refreshSession(new NextRequest(`https://kochivo.site${path}`), decideRoute);
  expect(response.headers.get('location')).toBe(redirect ? `https://kochivo.site${redirect}` : null);
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('my_approval_route_profile');
  expect(mocks.from).not.toHaveBeenCalled();
});

it('preserves anonymous fallback when no profile is returned', async () => {
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'caller', is_anonymous: true } }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  const response = await refreshSession(new NextRequest('https://kochivo.site/player'), decideRoute);
  expect(response.headers.get('location')).toBe('https://kochivo.site/demo');
});

it.each([null, { claims: {} }])('does no DB work without verified identity', async data => {
  mocks.claims.mockResolvedValue({ data, error: null });
  const response = await refreshSession(new NextRequest('https://kochivo.site/player'), decideRoute);
  expect(response.headers.get('location')).toBe('https://kochivo.site/login');
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.from).not.toHaveBeenCalled();
});

it('fails closed on a routing RPC error', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
  const response = await refreshSession(new NextRequest('https://kochivo.site/captain'), decideRoute);
  expect(response.headers.get('location')).toBe('https://kochivo.site/login');
});

it.each(['pending', 'rejected'] as const)('uses the %s status returned by the routing RPC', async captain_status => {
  mocks.rpc.mockResolvedValue({ data: [{ role: 'captain', role_confirmed: true,
    suspended_at: null, is_admin: false, captain_status }], error: null });
  const response = await refreshSession(new NextRequest('https://kochivo.site/captain/players'), decideRoute);
  expect(response.headers.get('location')).toBe('https://kochivo.site/captain/pending');
  expect(mocks.from).not.toHaveBeenCalled();
});

it('does no DB work when verification fails even if a subject is returned', async () => {
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'caller' } }, error: { message: 'invalid' } });
  const response = await refreshSession(new NextRequest('https://kochivo.site/player'), decideRoute);
  expect(response.headers.get('location')).toBe('https://kochivo.site/login');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
