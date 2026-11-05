import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { SignOutButton } from './components/sign-out-button';

const state = vi.hoisted(() => ({ auth: vi.fn(), assign: vi.fn(), steps: [] as string[] }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => ['', () => {}], useTransition: () => [false, (action: () => Promise<void>) => action()] }));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('./data/sign-out', () => ({ signOut: state.auth }));
vi.mock('./data/client-action', () => ({ callAuthAction: (action: () => Promise<unknown>) => action() }));
vi.mock('./data/clear-device', () => ({ finalDeviceSync: async () => { state.steps.push('sync'); },
  clearDeviceCache: async () => { state.steps.push('cache'); }, closeDeviceDb: async () => { state.steps.push('close'); } }));
vi.mock('@/features/notifications', () => ({ unsubscribeDevicePush: async () => { state.steps.push('push'); } }));
type Node = ReactElement<{ children?: unknown; onClick?: () => Promise<void> }>;
function clickable(value: unknown): Node | undefined {
  if (Array.isArray(value)) return value.map(clickable).find(Boolean);
  if (!isValidElement<Node['props']>(value)) return undefined;
  return value.props.onClick ? value : clickable(value.props.children);
}
afterEach(() => vi.unstubAllGlobals());
it('signs out, clears device data, and navigates from the pending-screen button', async () => {
  state.steps = []; state.assign.mockReset();
  state.auth.mockImplementation(async () => { state.steps.push('auth'); return { redirect: '/login' }; });
  vi.stubGlobal('window', { location: { assign: state.assign } });
  // Execute all cleanup promises immediately without starting real timeout handles.
  vi.stubGlobal('setTimeout', () => 1); vi.stubGlobal('clearTimeout', () => {});
  const button = clickable(SignOutButton({ variant: 'danger' }));
  expect(button).toBeDefined();
  await button?.props.onClick?.();
  expect(state.steps).toEqual(['push', 'sync', 'auth', 'cache', 'close']);
  expect(state.assign).toHaveBeenCalledExactlyOnceWith('/login');
});
