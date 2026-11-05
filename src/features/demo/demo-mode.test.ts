import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DemoMode } from './components/demo-mode';

const profile = vi.hoisted(() => vi.fn());
vi.mock('./data/load-demo-profile', () => ({ loadDemoProfile: profile }));
vi.mock('next/navigation', () => ({ unstable_rethrow: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => 'lazy-demo-banner' }));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime('2026-11-05T12:00:00Z'); });
afterEach(() => vi.useRealTimers());

async function content(failOpen?: boolean) {
  const tree = DemoMode({ children: 'player-content', failOpen });
  const state = tree.props.children as ReactElement<{ children: ReactNode; failOpen?: boolean }>;
  const render = state.type as (props: { children: ReactNode; failOpen?: boolean }) => Promise<ReactNode>;
  return render(state.props);
}
it('keeps a real player app when the demo profile check fails', async () => {
  profile.mockRejectedValue(new Error('offline'));
  expect(await content(true)).toBe('player-content');
});
it('still shows the demo profile error for the captain demo', async () => {
  profile.mockRejectedValue(new Error('offline'));
  expect(await content()).toMatchObject({ props: {} });
  expect(await content()).not.toBe('player-content');
});
it('renders only player content for a real player without mounting demo UI', async () => {
  profile.mockResolvedValue({ expiresAt: null, role: 'player' });
  expect(await content()).toBe('player-content');
});
it('renders the lazy player banner and preserves the content for a demo player', async () => {
  profile.mockResolvedValue({ expiresAt: '2099-01-01T12:00:00Z', role: 'player' });
  const provider = await content() as ReactElement<{ children: ReactElement[] }>;
  const banner = provider.props.children[0];
  expect(banner).toMatchObject({ type: 'lazy-demo-banner', props: { role: 'player' } });
  expect(provider.props.children[1]).toBe('player-content');
});
