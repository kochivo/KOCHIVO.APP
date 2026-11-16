import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ list: vi.fn(), load: vi.fn() }));
vi.mock('./plan-io', () => ({ listPlayerPlans: state.list, loadPlan: state.load }));
import { currentFoodPlan } from './library-plan';
const player = '019a805e-0000-7000-8000-000000000001';
beforeEach(() => { vi.clearAllMocks(); state.load.mockResolvedValue({ ok: true, data: { id: 'active', meals: [] } }); });
it('selects the active plan before a newer draft and loads the existing plan path', async () => {
  state.list.mockResolvedValue({ ok: true, data: [{ id: 'draft', status: 'draft' }, { id: 'active', status: 'active' }] });
  expect(await currentFoodPlan(player)).toMatchObject({ id: 'active' });
  expect(state.load).toHaveBeenCalledWith('active');
});
it('never offers archived plans and propagates read failures', async () => {
  state.list.mockResolvedValue({ ok: true, data: [{ id: 'old', status: 'archived' }] });
  expect(await currentFoodPlan(player)).toBeNull(); expect(state.load).not.toHaveBeenCalled();
  state.list.mockResolvedValue({ ok: false, error: 'Read failed' });
  await expect(currentFoodPlan(player)).rejects.toThrow('Read failed');
});
