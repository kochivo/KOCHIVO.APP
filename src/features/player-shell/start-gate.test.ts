import { beforeEach, expect, it, vi } from 'vitest';
import { needsStartGate, gateApplies } from './start-gate';
import { loadStartGate } from './data/start-gate';

const state = vi.hoisted(() => ({ captain: 'new' as string | null, error: null as Error | null }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'player' } } }) },
  rpc: async () => ({ data: state.captain, error: state.error }),
  from: () => {
    const filters: Record<string, unknown> = {};
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters[key] = value; return query; },
      order: () => query,
      single: async () => ({ data: { full_name: 'Player' } }),
      range: async () => ({ data: [
        { id: 'old-request', captain_id: 'old', player_id: 'player', blocks_access: true, answered_at: null, forms: { title: 'Old' } },
        { id: 'new-request', captain_id: 'new', player_id: 'player', blocks_access: true, answered_at: null, forms: { title: 'New' } },
      ].filter(row => Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value)) }),
    };
    return query;
  },
}) }));
beforeEach(() => { state.captain = 'new'; state.error = null; });

it('gates only pending blocking requests', () => {
  expect(needsStartGate([{ blocks_access: true, answered_at: null }])).toBe(true);
  expect(needsStartGate([{ blocks_access: false, answered_at: null }])).toBe(false);
  expect(needsStartGate([{ blocks_access: true, answered_at: '2026-11-03' }])).toBe(false);
  expect(needsStartGate([])).toBe(false);
});
it('keeps answers, chat and settings reachable while gating training routes', () => {
  for (const path of ['/ar/player/forms/abc', '/player/settings', '/player/captain', '/player/chat']) expect(gateApplies(path)).toBe(false);
  for (const path of ['/player', '/player/program', '/player/food', '/player/workout/abc']) expect(gateApplies(path)).toBe(true);
});

it('ignores blocking forms from the previous captain', async () => {
  expect(await loadStartGate()).toEqual({ name: 'Player', rows: [
    { id: 'new-request', title: 'New', blocks_access: true, answered_at: null },
  ] });
});
it('has no blocking forms without a current captain', async () => {
  state.captain = null;
  expect(await loadStartGate()).toEqual({ name: 'Player', rows: [] });
});
it('propagates a captain lookup failure instead of unlocking the gate', async () => {
  state.error = new Error('captain lookup failed');
  await expect(loadStartGate()).rejects.toThrow('captain lookup failed');
});
