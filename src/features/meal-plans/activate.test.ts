import { beforeEach, expect, it, vi } from 'vitest';
import { activatePlan } from './data/activate';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('./data/client', () => ({ planClient: async () => ({ rpc }) }));
const id = '01900000-0000-7000-8000-000000000001';
beforeEach(() => vi.resetAllMocks());

it.each([
  ['22023', 'ضيف وجبة وأكلة الأول'],
  ['42501', 'التفعيل متعملش. جرّب تاني'],
  ['P0002', 'التفعيل متعملش. جرّب تاني'],
  ['PGRST116', 'التفعيل متعملش. جرّب تاني'],
  ['unknown', 'التفعيل متعملش. جرّب تاني'],
])('preserves meal-plan activation error %s', async (code, message) => {
  rpc.mockResolvedValue({ error: { code } });
  await expect(activatePlan(id)).rejects.toThrow(message);
});

it('activates the selected plan', async () => {
  rpc.mockResolvedValue({ error: null });
  await expect(activatePlan(id)).resolves.toBeUndefined();
  expect(rpc).toHaveBeenCalledWith('activate_nutrition_plan', { p_plan: id });
});

it('preserves validation and transport exceptions', async () => {
  await expect(activatePlan('bad')).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockRejectedValue(new Error('private'));
  await expect(activatePlan(id)).rejects.toThrow('private');
});
