import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { CaptainDevice } from './components/captain-device';

const state = vi.hoisted(() => ({ effects: [] as (() => void)[], loaded: [] as string[] }));
vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof ReactModule>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
}));
vi.mock('@/features/feedback', () => { state.loaded.push('feedback'); return { FeedbackButton: () => null }; });
vi.mock('@/features/install', () => { state.loaded.push('install'); return { InstallSheet: () => null }; });
afterEach(() => { state.effects = []; vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('remembers captain on mount without loading add-ons for the server render', () => {
  const setItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { setItem } });
  const html = renderToStaticMarkup(createElement(CaptainDevice));
  expect(setItem).not.toHaveBeenCalled();
  state.effects.forEach(effect => effect());
  expect(setItem).toHaveBeenCalledWith('kochivo.role', 'captain');
  expect(html).not.toContain('aria-label="بلّغ عن مشكلة"');
  expect(state.loaded).toEqual([]);
});
