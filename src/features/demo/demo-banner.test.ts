import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { DemoBanner } from './components/demo-banner';

const state = vi.hoisted(() => ({ steps: [] as string[], push: vi.fn(), refresh: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: () => ['', () => {}] }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push, refresh: state.refresh }) }));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ auth: {
  signOut: async () => { state.steps.push('auth'); return { error: null }; },
} }) }));
vi.mock('@/core/pwa/clear-device', () => ({
  finalDeviceSync: async () => { state.steps.push('sync'); },
  clearDeviceCache: async () => { state.steps.push('cache'); },
  closeDeviceDb: async () => { state.steps.push('close'); },
}));
vi.mock('@/features/notifications', () => ({ unsubscribeDevicePush: async () => { state.steps.push('push'); } }));

type Node = ReactElement<{ children?: unknown; onClick?: (event: { preventDefault: () => void }) => Promise<void> }>;
function clickable(value: unknown): Node | undefined {
  if (Array.isArray(value)) return value.map(clickable).find(Boolean);
  if (!isValidElement<Node['props']>(value)) return undefined;
  return value.props.onClick ? value : clickable(value.props.children);
}
afterEach(() => vi.unstubAllGlobals());
it('exits a player demo through final sync and normal device cleanup before signup', async () => {
  state.steps = [];
  vi.stubGlobal('setTimeout', () => 1); vi.stubGlobal('clearTimeout', () => {});
  await clickable(DemoBanner({ hours: 24, role: 'player' }))?.props.onClick?.({ preventDefault: vi.fn() });
  expect(state.steps).toEqual(['push', 'sync', 'auth', 'cache', 'close']);
  expect(state.push).toHaveBeenCalledWith('/login?tab=signup');
  expect(state.refresh).toHaveBeenCalledOnce();
});
