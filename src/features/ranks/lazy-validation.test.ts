import { expect, it, vi } from 'vitest';
import type * as ZodModule from 'zod';
import { loadMyPoints } from './data/load-my-points';
import { loadLeaderboard } from './data/load-leaderboard';
import { loadHallOfFame } from './data/load-hall-of-fame';

const runtime = vi.hoisted(() => ({ loaded: false, rpc: vi.fn() }));
vi.mock('zod', async original => {
  runtime.loaded = true;
  return original<typeof ZodModule>();
});
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc: runtime.rpc }) }));

it('imports loaders without Zod and still validates responses when requested', async () => {
  expect(runtime.loaded).toBe(false);
  runtime.rpc.mockResolvedValue({ data: [], error: null });
  expect(await loadLeaderboard()).toEqual([]);
  expect(runtime.loaded).toBe(true);
  expect(await loadHallOfFame()).toEqual([]);
  runtime.rpc.mockResolvedValue({ data: { lifetime: -1 }, error: null });
  await expect(loadMyPoints()).rejects.toMatchObject({ name: 'ZodError' });
  runtime.rpc.mockResolvedValue({ data: [{ player_id: 'invalid' }], error: null });
  await expect(loadLeaderboard()).rejects.toMatchObject({ name: 'ZodError' });
  await expect(loadHallOfFame()).rejects.toMatchObject({ name: 'ZodError' });
});
