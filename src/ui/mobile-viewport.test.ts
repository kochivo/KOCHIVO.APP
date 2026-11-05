import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { MobileViewport } from './mobile-viewport';

const lifecycle = vi.hoisted(() => ({ effect: undefined as (() => (() => void) | undefined) | undefined }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useEffect: (effect: () => (() => void) | undefined) => { lifecycle.effect = effect; },
}));
afterEach(() => vi.unstubAllGlobals());

it('keeps the focused field visible as the keyboard shrinks and restores the visual viewport', () => {
  const properties = new Map<string, string>();
  class Field {
    matches = () => true;
    scrollIntoView = vi.fn();
  }
  const field = new Field();
  const viewport = Object.assign(new EventTarget(), { height: 740, offsetTop: 0, scale: 1 });
  const document = Object.assign(new EventTarget(), {
    activeElement: field,
    documentElement: { dataset: {} as Record<string, string>, style: {
      setProperty: (key: string, value: string) => properties.set(key, value),
      removeProperty: (key: string) => properties.delete(key),
    } },
  });
  vi.stubGlobal('window', { visualViewport: viewport, innerHeight: 740 });
  vi.stubGlobal('document', document);
  vi.stubGlobal('HTMLElement', Field);
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => { callback(); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  MobileViewport();
  const cleanup = lifecycle.effect?.();
  viewport.height = 400;
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.get('--visible-viewport-height')).toBe('400px');
  expect(properties.get('--keyboard-inset')).toBe('340px');
  expect(document.documentElement.dataset.keyboard).toBe('open');
  expect(field.scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
  viewport.height = 740;
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.get('--keyboard-inset')).toBe('0px');
  expect(document.documentElement.dataset.keyboard).toBe('closed');
  viewport.scale = 2;
  viewport.height = 370;
  viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.dataset.keyboard).toBe('closed');
  expect(properties.has('--visible-viewport-height')).toBe(false);
  viewport.scale = 1;
  viewport.height = 400;
  document.activeElement.matches = () => false;
  viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.dataset.keyboard).toBe('closed');
  cleanup?.();
  expect(properties.size).toBe(0);
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.size).toBe(0);
});
