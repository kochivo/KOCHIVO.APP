import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { savePlan } from './data/plan-io';
import type { PlanDraft } from './types';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('./data/client', () => ({ planClient: async () => ({ rpc }) }));
const id = '01900000-0000-7000-8000-000000000001';
const draft: PlanDraft = { id, playerId: null, title: 'Plan', status: 'draft', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 },
  meals: [{ id, name: 'Meal', position: 1, dayType: 'training', items: [] }] };
beforeEach(() => { rpc.mockReset().mockResolvedValue({ error: null }); });
afterEach(() => vi.unstubAllEnvs());
it('passes day types to the atomic overload only when enabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(await savePlan(draft)).toMatchObject({ ok: true });
  expect(rpc).toHaveBeenCalledWith('save_nutrition_plan', expect.objectContaining({ p_day_types: [{ id, dayType: 'training' }] }));
});
it('retains the original RPC arguments with flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await savePlan(draft);
  expect(rpc).toHaveBeenCalledWith('save_nutrition_plan', { p_plan: id, p_draft: draft });
});
