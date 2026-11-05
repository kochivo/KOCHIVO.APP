vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { beforeEach, expect, it, vi } from 'vitest';
import { activateProgram } from './data/activate';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc }) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
const id = '01900000-0000-7000-8000-000000000001';
beforeEach(() => vi.resetAllMocks());

it.each([
  ['22023', 'ضيف يوم فيه تمرين واختار لاعب الأول'],
  ['42501', 'البرنامج مش متاح ليك'],
  ['P0002', 'التفعيل متعملش. جرّب تاني'],
  ['PGRST116', 'التفعيل متعملش. جرّب تاني'],
  ['unknown', 'التفعيل متعملش. جرّب تاني'],
])('preserves program activation error %s', async (code, error) => {
  mocks.rpc.mockResolvedValue({ error: { code } });
  expect(await activateProgram(id)).toEqual({ ok: false, error });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

it('revalidates captain and player screens after activation', async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  expect(await activateProgram(id)).toEqual({ ok: true, data: true });
  expect(mocks.rpc).toHaveBeenCalledWith('activate_program', { p_program: id });
  expect(mocks.revalidate.mock.calls).toEqual([['/captain'], ['/player']]);
});

it('preserves validation and transport failure results', async () => {
  expect(await activateProgram('bad')).toEqual({ ok: false, error: 'البرنامج مش موجود' });
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockRejectedValue(new Error('private'));
  expect(await activateProgram(id)).toEqual({ ok: false, error: 'التفعيل متعملش. جرّب تاني' });
});
