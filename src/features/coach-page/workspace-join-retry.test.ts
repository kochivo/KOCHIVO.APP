import { Children, isValidElement } from 'react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Button } from '@/ui/button';
import { WorkspaceJoinView } from './components/workspace-join-view';

const state = vi.hoisted(() => ({ loadRequests: vi.fn(), retryLink: vi.fn(), pending: [] as Promise<unknown>[] }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [undefined, () => {}],
  useTransition: () => [false, (callback: () => Promise<unknown>) => { state.pending.push(callback()); }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('./data/join-requests', () => ({ loadJoinRequests: state.loadRequests }));

function retryButtons(node: ReactNode): (() => void)[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child)) return [];
    if (child.type === Button && child.props.children === 'retry' && child.props.onClick) return [child.props.onClick];
    return retryButtons(child.props.children);
  });
}
function view() {
  return WorkspaceJoinView({ initialRequests: { error: 'Unavailable' }, initialLink: { error: true },
    retryLinkAction: state.retryLink, now: Date.parse('2026-11-18T12:00:00Z'), phone: false });
}
beforeEach(() => {
  state.pending = [];
  state.loadRequests.mockReset().mockResolvedValue({ data: [] });
  state.retryLink.mockReset().mockResolvedValue({ slug: 'coach' });
});

it('retries requests independently of the invite link', async () => {
  const [requests] = retryButtons(view());
  expect(requests).toBeTypeOf('function');
  requests?.();
  await Promise.all(state.pending);
  expect(state.loadRequests).toHaveBeenCalledOnce();
  expect(state.retryLink).not.toHaveBeenCalled();
});

it('retries the invite link independently of requests', async () => {
  const [, link] = retryButtons(view());
  expect(link).toBeTypeOf('function');
  link?.();
  await Promise.all(state.pending);
  expect(state.retryLink).toHaveBeenCalledOnce();
  expect(state.loadRequests).not.toHaveBeenCalled();
});
