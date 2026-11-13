import { afterEach, expect, it, vi } from 'vitest';
import type * as ReactModule from 'react';
import { PublicCount } from './components/public-count';
const hooks = vi.hoisted(() => ({ effect: undefined as (() => (() => void) | undefined) | undefined, setCount: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: (value: number) => [value, hooks.setCount], useRef: () => ({ current: {} }),
  useEffect: (effect: typeof hooks.effect) => { hooks.effect = effect; },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en' }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('counts once on entry using frame timestamps, disconnects and cancels on cleanup', () => {
  let notify: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  let tick: ((now: number) => void) | undefined;
  const disconnect = vi.fn(), cancel = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: NonNullable<typeof notify>) { notify = callback; }
    observe() {} disconnect = disconnect;
  });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('requestAnimationFrame', (callback: typeof tick) => { tick = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  PublicCount({ value: 100, unit: '%' });
  const cleanup = hooks.effect?.();
  notify?.([{ isIntersecting: false }]); expect(tick).toBeUndefined();
  notify?.([{ isIntersecting: true }]); expect(disconnect).toHaveBeenCalledOnce();
  tick?.(1000); expect(hooks.setCount).toHaveBeenLastCalledWith(0);
  tick?.(1350); expect(hooks.setCount).toHaveBeenLastCalledWith(50);
  tick?.(1700); expect(hooks.setCount).toHaveBeenLastCalledWith(100);
  cleanup?.(); expect(cancel).toHaveBeenCalledWith(1);
});
it('keeps final values without animation for reduced motion', () => {
  const observer = vi.fn(); vi.stubGlobal('IntersectionObserver', observer);
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  const tree = PublicCount({ value: 4210, unit: '' });
  hooks.effect?.();
  expect(tree.props['aria-label']).toBe('4,210');
  expect(observer).not.toHaveBeenCalled();
});
