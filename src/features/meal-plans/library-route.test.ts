import { afterEach, expect, it, vi } from 'vitest';
const missing = vi.hoisted(() => vi.fn(() => { throw new Error('not found'); }));
vi.mock('next/navigation', () => ({ notFound: missing }));
vi.mock('@/features/meal-plans', () => ({ FoodsLibraryEntry: () => null }));
import Page from '../../app/[locale]/(captain)/captain/library/foods/page';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('calls notFound when the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(() => Page()).toThrow('not found');
  expect(missing).toHaveBeenCalledOnce();
});
it('renders the library only when enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(Page()).toBeTruthy();
  expect(missing).not.toHaveBeenCalled();
});
