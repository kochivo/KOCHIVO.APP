import { afterEach, expect, it, vi } from 'vitest';
import { openGeneratorWhenReady } from './components/workspace-generator-trigger';

afterEach(() => vi.unstubAllGlobals());
it('opens on the first request even when the generator finishes loading later', () => {
  let notify: (() => void) | undefined;
  const disconnect = vi.fn(), click = vi.fn();
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  });
  let ready = false;
  const root = { querySelector: () => ready ? { click } : null } as unknown as HTMLElement;
  const cleanup = openGeneratorWhenReady(root);
  expect(click).not.toHaveBeenCalled();
  ready = true;
  notify?.();
  notify?.();
  expect(click).toHaveBeenCalledTimes(1);
  cleanup();
  expect(disconnect).toHaveBeenCalled();
});
it('opens an already mounted generator without waiting for a DOM change', () => {
  const click = vi.fn();
  const root = { querySelector: () => ({ click }) } as unknown as HTMLElement;
  openGeneratorWhenReady(root)();
  expect(click).toHaveBeenCalledTimes(1);
});
