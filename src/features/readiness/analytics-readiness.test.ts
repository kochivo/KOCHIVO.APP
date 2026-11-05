import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { KochivoDB, stableId } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { loadTodayReadiness } from './data/load-today-readiness';

const db = new KochivoDB('analytics-readiness');
const remote = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./data/coach-readiness', () => ({ fetchCoachReadiness: remote.read }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), localDb: () => db }));
beforeEach(async () => { remote.read.mockReset(); await db.daily_checks.clear(); });
afterAll(async () => { await db.delete(); });
const today = '2026-11-04';
const check = { id: 'remote', player_id: 'player', log_date: today, sleep_hours: 8, water_ml: 3000,
  soreness: 1, deleted_at: null, client_updated_at: '2026-11-04T08:00:00Z' };
function daily(checks: typeof check[]) {
  return { checks, goal: 3000, decisions: [], sessions: [], exercises: [], training: [] };
}
it('uses today’s check and returns no score for other dates', async () => {
  remote.read.mockResolvedValue(daily([check]));
  expect(await loadTodayReadiness('player', today, false)).toBe(100);
  remote.read.mockResolvedValue(daily([{ ...check, log_date: '2026-11-03' }]));
  expect(await loadTodayReadiness('player', today, false)).toBeNull();
});
it('prefers a newer local check for the player and the remote check for the coach', async () => {
  remote.read.mockResolvedValue(daily([check]));
  await db.daily_checks.put({ ...check, id: await stableId('daily_check', 'player', today),
    sleep_hours: 4, water_ml: 0, soreness: 5, client_updated_at: '2026-11-04T09:00:00Z' });
  expect(await loadTodayReadiness('player', today, true)).toBe(0);
  expect(await loadTodayReadiness('player', today, false)).toBe(100);
});
it('keeps a newer remote check and propagates failures to the retry UI', async () => {
  remote.read.mockResolvedValue(daily([check]));
  await db.daily_checks.put({ ...check, id: await stableId('daily_check', 'player', today),
    sleep_hours: 4, client_updated_at: '2026-11-04T07:00:00Z' });
  expect(await loadTodayReadiness('player', today, true)).toBe(100);
  remote.read.mockRejectedValue(new Error('Unavailable'));
  await expect(loadTodayReadiness('player', today, false)).rejects.toThrow('Unavailable');
});
