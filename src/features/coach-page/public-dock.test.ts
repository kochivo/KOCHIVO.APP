import { afterEach, expect, it, vi } from 'vitest';
import type * as ReactModule from 'react';
import { PublicDock } from './components/public-dock';

const hooks = vi.hoisted(() => ({ effect: undefined as (() => (() => void) | undefined) | undefined, setVisible: vi.fn() }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof ReactModule>(),
  useState: () => [false, hooks.setVisible],
  useEffect: (effect: typeof hooks.effect) => { hooks.effect = effect; },
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('shows the dock only after the hero name has scrolled above the viewport, then cleans up', () => {
  let notify: ((entries: { isIntersecting: boolean; boundingClientRect: { bottom: number } }[]) => void) | undefined;
  const observe = vi.fn(), disconnect = vi.fn();
  const name = {};
  vi.stubGlobal('document', { getElementById: () => name });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: NonNullable<typeof notify>) { notify = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  const tree = PublicDock({ children: null });
  expect(tree.props.hidden).toBe(true);
  const cleanup = hooks.effect?.();
  expect(observe).toHaveBeenCalledWith(name);
  notify?.([{ isIntersecting: false, boundingClientRect: { bottom: 800 } }]);
  expect(hooks.setVisible).toHaveBeenLastCalledWith(false);
  notify?.([{ isIntersecting: true, boundingClientRect: { bottom: 100 } }]);
  expect(hooks.setVisible).toHaveBeenLastCalledWith(false);
  notify?.([{ isIntersecting: false, boundingClientRect: { bottom: -1 } }]);
  expect(hooks.setVisible).toHaveBeenLastCalledWith(true);
  cleanup?.();
  expect(disconnect).toHaveBeenCalledOnce();
});
it('uses a passive scroll fallback when IntersectionObserver is unavailable', () => {
  const addEventListener = vi.fn(), removeEventListener = vi.fn();
  vi.stubGlobal('document', { getElementById: () => ({ getBoundingClientRect: () => ({ bottom: -1 }) }) });
  vi.stubGlobal('IntersectionObserver', undefined);
  vi.stubGlobal('window', { addEventListener, removeEventListener });
  PublicDock({ children: null });
  const cleanup = hooks.effect?.();
  expect(hooks.setVisible).toHaveBeenCalledWith(true);
  expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  cleanup?.();
  expect(removeEventListener).toHaveBeenCalledWith('scroll', addEventListener.mock.calls[0]?.[1]);
});
