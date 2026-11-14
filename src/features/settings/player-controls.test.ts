import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { PlayerPreferences } from './components/player-preferences';
import { PlayerTheme } from './components/player-theme';

const state = vi.hoisted(() => ({ language: vi.fn(), units: vi.fn(), refresh: vi.fn(), push: vi.fn(),
  updates: [] as unknown[], events: [] as string[], storage: vi.fn(), fail: false }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => [initial, (value: unknown) => { state.updates.push(value); }],
  useRef: (value: unknown) => ({ current: value }), useSyncExternalStore: () => 'dark',
}));
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar'),
  useLocale: () => 'ar', useArabicStyle: () => 'egyptian' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh, push: state.push }) }));
vi.mock('./data/language', () => ({ saveLanguage: state.language }));
vi.mock('./data/player-units', () => ({ savePlayerUnits: state.units }));
type Node = ReactElement<{ children?: unknown; onClick?: () => void | Promise<void>; 'aria-pressed'?: boolean }>;
function buttons(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(buttons);
  if (!isValidElement<Node['props']>(value)) return [];
  return [...(value.type === 'button' ? [value] : []), ...buttons(value.props.children)];
}
beforeEach(() => {
  vi.clearAllMocks(); state.updates = []; state.events = [];
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  state.language.mockResolvedValue(undefined); state.units.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('saves English through the existing language action and refreshes the locale', async () => {
  const tree = PlayerPreferences({ units: 'metric' });
  const control = buttons(tree).find(button => button.props.children === 'English');
  await control?.props.onClick?.();
  expect(state.language).toHaveBeenCalledExactlyOnceWith({ locale: 'en', label: 'english' });
  expect(state.refresh).toHaveBeenCalledOnce();
});
it('does not offer a manual Arabic style in More', () => {
  expect(buttons(PlayerPreferences({ units: 'metric', styleOnly: true }))).toHaveLength(0);
});
it('saves imperial units optimistically and rolls back a failed write', async () => {
  state.units.mockRejectedValue(new Error('offline'));
  const control = buttons(PlayerPreferences({ units: 'metric' })).find(button => button.props.children === 'رطل');
  await control?.props.onClick?.();
  // Event handlers deliberately discard the promise; wait for its rejection handler.
  await Promise.resolve();
  expect(state.units).toHaveBeenCalledExactlyOnceWith('imperial');
  expect(state.updates).toContain('imperial');
  expect(state.updates).toContain('metric');
  expect(state.updates).toContain(true);
});
it('replays the existing player tour from the guide row', () => {
  vi.stubGlobal('window', { dispatchEvent: (event: Event) => { state.events.push(event.type); } });
  const control = buttons(PlayerPreferences({ units: 'metric' })).find(button => Array.isArray(button.props.children));
  control?.props.onClick?.();
  expect(state.events).toEqual(['kochivo:replay-tour']);
  expect(state.push).toHaveBeenCalledExactlyOnceWith('/player');
});
it('writes the existing theme storage key and broadcasts the existing theme event', () => {
  const root = { dataset: { theme: 'dark', themeMode: 'system' }, style: { colorScheme: 'dark' } };
  vi.stubGlobal('document', { documentElement: root });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('localStorage', { setItem: state.storage });
  vi.stubGlobal('window', { dispatchEvent: (event: Event) => { state.events.push(event.type); } });
  buttons(PlayerTheme()).find(button => button.props.children === 'فاتح')?.props.onClick?.();
  expect(root.dataset).toEqual({ theme: 'light', themeMode: 'light' });
  expect(root.style.colorScheme).toBe('light');
  expect(state.storage).toHaveBeenCalledExactlyOnceWith('kochivo.theme', 'light');
  expect(state.events).toEqual(['kochivo:theme-change']);
});
