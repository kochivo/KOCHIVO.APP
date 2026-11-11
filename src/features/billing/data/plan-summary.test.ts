import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { captainClient } from './client';
import { fetchPlanSummary } from './plan-summary';
import { fetchDues } from './dues';

vi.mock('server-only', () => ({}));
vi.mock('react', async original => {
  const { createRequire } = await import('node:module');
  const { dirname, join } = await import('node:path');
  const require = createRequire(import.meta.url);
  const server = require(join(dirname(require.resolve('react')), 'cjs/react.react-server.development.js')) as typeof React;
  return { ...await original<typeof React>(), cache: server.cache };
});
const fake = vi.hoisted(() => ({ claims: vi.fn(), from: vi.fn(), rpc: vi.fn(), role: 'captain' }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: fake.claims }, from: fake.from, rpc: fake.rpc,
}) }));

const require = createRequire(import.meta.url);
const serverReact = require(join(dirname(require.resolve('react')), 'cjs/react.react-server.development.js')) as {
  __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
    A: { getCacheForType: (factory: () => unknown) => unknown } | null;
  };
};
const internals = serverReact.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
afterEach(() => { internals.A = null; });
function newRequest() {
  const roots = new Map<() => unknown, unknown>();
  internals.A = { getCacheForType(factory) {
    if (!roots.has(factory)) roots.set(factory, factory());
    return roots.get(factory);
  } };
}

beforeEach(() => {
  vi.clearAllMocks();
  newRequest();
  fake.role = 'captain';
  fake.claims.mockResolvedValue({ data: { claims: { sub: 'captain-1' } }, error: null });
  fake.rpc.mockImplementation(async (name: string) => ({ data: name === 'current_tier' ? 'free' : [], error: null }));
  fake.from.mockImplementation((table: string) => {
    const result = table === 'profiles' ? { data: { role: fake.role }, error: null }
      : table === 'plan_tiers' ? { data: { tier: 'free', price_egp: 0, player_limit: 5 }, error: null }
        : { count: 2, error: null };
    const query = { select: () => query, eq: () => query, is: async () => result, single: async () => result };
    return query;
  });
});

it('shares the plan promise, RPC, role query and supporting reads within a request', async () => {
  const first = fetchPlanSummary();
  const second = fetchPlanSummary();
  expect(await first).toEqual({ plan: { tier: 'free', price_egp: 0, player_limit: 5 }, used: 2 });
  expect(await second).toBe(await first);
  expect(second).toBe(first);
  expect(fake.rpc).toHaveBeenCalledExactlyOnceWith('current_tier', { p_captain: 'captain-1' });
  expect(fake.from.mock.calls.map(([table]) => table)).toEqual(['profiles', 'plan_tiers', 'coach_clients']);
});

it('shares captain authentication between two different loaders', async () => {
  await Promise.all([fetchPlanSummary(), fetchDues()]);
  expect(fake.claims).toHaveBeenCalledOnce();
  expect(fake.from.mock.calls.filter(([table]) => table === 'profiles')).toHaveLength(1);
});

it('does not reuse the captain or plan across requests', async () => {
  await fetchPlanSummary();
  newRequest();
  await fetchPlanSummary();
  expect(fake.claims).toHaveBeenCalledTimes(2);
  expect(fake.rpc).toHaveBeenCalledTimes(2);
});

it('keeps the missing session rejection and shares it in the request', async () => {
  fake.claims.mockResolvedValue({ data: { claims: {} }, error: null });
  const first = captainClient();
  await expect(first).rejects.toThrow('captain session required');
  const second = captainClient();
  await expect(second).rejects.toThrow('captain session required');
  expect(second).toBe(first);
  expect(fake.from).not.toHaveBeenCalled();
});

it('keeps the captain role rejection', async () => {
  fake.role = 'player';
  await expect(captainClient()).rejects.toThrow('captain required');
});
