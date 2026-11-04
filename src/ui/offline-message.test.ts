import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { OfflineMessage } from './offline-message';
import { messages } from '@/core/pwa/messages';

const state = vi.hoisted(() => ({ hydrated: false }));
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof ReactModule>();
  return { ...original, useSyncExternalStore: (_subscribe: unknown, client: () => unknown, server: () => unknown) =>
    state.hydrated ? client() : server() };
});
afterEach(() => { state.hydrated = false; vi.unstubAllGlobals(); });

it.each(['ar', 'en'] as const)('uses generic SSR and the stored role after hydration in %s', locale => {
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(OfflineMessage)));
  for (const role of ['player', 'captain', null, 'invalid']) {
    vi.stubGlobal('window', { localStorage: { getItem: () => role } });
    state.hydrated = false;
    expect(render()).toContain(messages[locale].offlineGeneric.replaceAll("'", '&#x27;'));
    state.hydrated = true;
    const key = role === 'player' ? 'todaySWorkoutIsSavedOn' : role === 'captain' ? 'offlineCaptain' : 'offlineGeneric';
    // React escapes apostrophes in English text.
    expect(render()).toContain(messages[locale][key].replaceAll("'", '&#x27;'));
  }
});

it('shows generic text when storage throws', () => {
  state.hydrated = true;
  vi.stubGlobal('window', { get localStorage() { throw new Error('blocked'); } });
  expect(renderToStaticMarkup(createElement(OfflineMessage))).toContain(messages.ar.offlineGeneric);
});
