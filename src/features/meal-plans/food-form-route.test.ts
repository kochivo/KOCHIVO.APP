import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NewFoodPage from '../../app/[locale]/(captain)/captain/library/foods/new/page';
import EditFoodPage from '../../app/[locale]/(captain)/captain/library/foods/[foodId]/edit/page';

const mocks = vi.hoisted(() => ({ edit: vi.fn(), copy: vi.fn(), notFound: vi.fn(() => { throw new Error('not found'); }) }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/features/meal-plans', () => ({ FoodFormEntry: () => null }));
vi.mock('@/features/meal-plans/server', () => ({ loadFoodForEdit: mocks.edit, loadFoodForCopy: mocks.copy }));
const own = { ok: true, data: { id: 'own', name: 'Rice', custom: true } };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  mocks.edit.mockResolvedValue(own);
  mocks.copy.mockResolvedValue({ ok: true, data: { ...own.data, id: 'global', custom: false } });
});
afterEach(() => vi.unstubAllEnvs());
it('opens a blank new-food screen without loading an editable row', async () => {
  const page = await NewFoodPage({ searchParams: Promise.resolve({}) });
  expect(page.props.result).toBeUndefined();
  expect(mocks.edit).not.toHaveBeenCalled();
  expect(mocks.copy).not.toHaveBeenCalled();
});
it('loads a copy source only through the global-copy loader', async () => {
  const page = await NewFoodPage({ searchParams: Promise.resolve({ copyFrom: 'global', returnTo: '/en/captain/library/foods' }) });
  expect(mocks.copy).toHaveBeenCalledWith('global');
  expect(mocks.edit).not.toHaveBeenCalled();
  expect(page.props).toMatchObject({ copyFrom: 'global', result: { data: { custom: false } } });
});
it('uses only the own-food loader for the edit route and forwards the return destination', async () => {
  const page = await EditFoodPage({ params: Promise.resolve({ foodId: 'own' }), searchParams: Promise.resolve({ returnTo: '/en/captain/library/foods' }) });
  expect(mocks.edit).toHaveBeenCalledWith('own');
  expect(mocks.copy).not.toHaveBeenCalled();
  expect(page.props).toEqual({ result: own, returnTo: '/en/captain/library/foods' });
});
it('passes a failed own-food read to the error view without falling back to copy or a blank form', async () => {
  const error = { ok: false, error: 'Food unavailable' };
  mocks.edit.mockResolvedValue(error);
  const page = await EditFoodPage({ params: Promise.resolve({ foodId: 'global' }), searchParams: Promise.resolve({}) });
  expect(page.props.result).toEqual(error);
  expect(mocks.copy).not.toHaveBeenCalled();
});
it('keeps both routes unavailable with the workspace flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(NewFoodPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('not found');
  await expect(EditFoodPage({ params: Promise.resolve({ foodId: 'own' }), searchParams: Promise.resolve({}) })).rejects.toThrow('not found');
  expect(mocks.edit).not.toHaveBeenCalled();
  expect(mocks.copy).not.toHaveBeenCalled();
});
