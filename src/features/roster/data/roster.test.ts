import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchCaptainFirstName, fetchRoster } from './roster';
import { fetchPlanSummary } from '@/features/billing/server';

vi.mock('server-only', () => ({}));
vi.mock('react', async original => {
  const { createRequire } = await import('node:module');
  const { dirname, join } = await import('node:path');
  const require = createRequire(import.meta.url);
  const server = require(join(dirname(require.resolve('react')), 'cjs/react.react-server.development.js')) as typeof React;
  return { ...await original<typeof React>(), cache: server.cache };
});
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
const fake = vi.hoisted(() => ({ claims: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
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
  fake.claims.mockResolvedValue({ data: { claims: { sub: 'captain-1' } }, error: null });
  fake.rpc.mockResolvedValue({ data: [], error: null });
  fake.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query,
      single: async () => ({ data: { full_name: '  Ali Hassan ', role: 'captain' }, error: null }) };
    return query;
  });
});

it('shares the roster RPC and result within one request', async () => {
  const first = fetchRoster();
  const second = fetchRoster();
  expect(await first).toEqual({ players: [] });
  expect(await second).toBe(await first);
  expect(second).toBe(first);
  expect(fake.rpc).toHaveBeenCalledExactlyOnceWith('captain_roster');
  newRequest();
  await fetchRoster();
  expect(fake.rpc).toHaveBeenCalledTimes(2);
});

it('shares the first name read within one request and refreshes it next request', async () => {
  expect(await fetchCaptainFirstName()).toBe('Ali');
  expect(await fetchCaptainFirstName()).toBe('Ali');
  expect(fake.claims).toHaveBeenCalledOnce();
  expect(fake.from).toHaveBeenCalledOnce();
  newRequest();
  await fetchCaptainFirstName();
  expect(fake.claims).toHaveBeenCalledTimes(2);
  expect(fake.from).toHaveBeenCalledTimes(2);
});

it('shares claims between the captain name and billing loaders', async () => {
  fake.rpc.mockResolvedValue({ data: null, error: null });
  await Promise.all([fetchCaptainFirstName(), fetchPlanSummary()]);
  expect(fake.claims).toHaveBeenCalledOnce();
});

it('keeps an empty first name for a missing session', async () => {
  fake.claims.mockResolvedValue({ data: null, error: null });
  expect(await fetchCaptainFirstName()).toBe('');
  expect(fake.from).not.toHaveBeenCalled();
});
