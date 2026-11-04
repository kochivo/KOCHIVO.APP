vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { beforeEach, expect, it, vi } from 'vitest';
import { savePlan } from './data/plan-io';
import type { PlanDraft } from './types';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('./data/client', () => ({ planClient: async () => ({ rpc }) }));
const draft: PlanDraft = { id: '01900000-0000-7000-8000-000000000001',
  playerId: '01900000-0000-7000-8000-000000000002', title: 'Plan', status: 'draft',
  targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [] };
beforeEach(() => vi.resetAllMocks());
it('returns validation errors without writing', async () => {
  await expect(savePlan({ ...draft, title: '' })).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  expect(rpc).not.toHaveBeenCalled();
});
it('returns a translated error for a failed save', async () => {
  rpc.mockResolvedValue({ error: { code: '42501', message: 'private details' } });
  await expect(savePlan(draft)).resolves.toEqual({ ok: false, error: 'الحفظ متعملش. جرّب تاني' });
});
it('allows saving an empty draft without changing activation rules', async () => {
  rpc.mockResolvedValue({ error: null });
  await expect(savePlan(draft)).resolves.toEqual({ ok: true, data: undefined });
  expect(rpc).toHaveBeenCalledWith('save_nutrition_plan', { p_plan: draft.id, p_draft: draft });
});
