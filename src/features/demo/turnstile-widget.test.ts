import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { TurnstileWidget } from './components/turnstile-widget';

const lifecycle = vi.hoisted(() => ({ effect: undefined as (() => (() => void)) | undefined }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useRef: () => ({ current: {} }),
  useEffect: (effect: () => (() => void)) => { lifecycle.effect = effect; },
}));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'en',
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en'),
}));
afterEach(() => vi.unstubAllGlobals());

it('sets verification language from the app locale instead of browser detection', () => {
  const render = vi.fn(() => 'widget');
  const remove = vi.fn();
  const script = { remove: vi.fn() };
  vi.stubGlobal('window', { turnstile: { render, remove } });
  vi.stubGlobal('document', { createElement: () => script });
  TurnstileWidget({ siteKey: 'site-key', onToken() {}, onError() {} });
  const cleanup = lifecycle.effect?.();
  expect(render).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ sitekey: 'site-key', language: 'en' }));
  cleanup?.();
  expect(remove).toHaveBeenCalledWith('widget');
});
