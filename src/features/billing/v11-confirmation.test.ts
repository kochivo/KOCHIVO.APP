import { Button } from '@/ui/button';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { WorkspaceBilling } from './components/workspace-billing';
import { decideRenewalRequest } from './data/renewal-requests';
import type { BillingResult } from './types';

const state = vi.hoisted(() => ({
  updates: [] as unknown[], refresh: vi.fn(), retry: vi.fn(), success: vi.fn(),
}));
const result: BillingResult = { data: { players: [], packages: [], used: 0, subscriptionEnd: null,
  plan: { tier: 'entry', price_egp: 0, player_limit: 5 }, revenue: { thisMonth: 0, lastMonth: 0, dues: 0, owing: 0 } } };
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  use: () => result,
  useState: (initial: unknown) => {
    let value = typeof initial === 'function' ? initial() : initial;
    return [value, (next: unknown) => {
      value = typeof next === 'function' ? next(value) : next;
      state.updates.push(value);
    }];
  },
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useSyncExternalStore: (_subscribe: unknown, _client: unknown, server: () => boolean) => server(),
  useTransition: () => [false, (callback: () => void) => callback()],
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Messages) => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: { data: [{ id: 'request', name: 'Ali', package: 'Monthly' }] }, retry: state.retry }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock('./data/renewal-requests', () => ({ listRenewalRequests: vi.fn(), decideRenewalRequest: vi.fn() }));
vi.mock('./receipts/captain-receipts', () => ({ CaptainReceipts: () => null }));

type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
async function confirm() {
  const tree = WorkspaceBilling({ data: Promise.resolve(result), today: '2026-11-14' });
  const button = nodes(tree).find(node => (node.type === 'button' || node.type === Button) && node.props.children === 'Approve');
  if (!button || typeof button.props.onClick !== 'function') throw new Error('Missing confirmation button');
  await button.props.onClick();
  await Promise.resolve();
}
beforeEach(() => { vi.clearAllMocks(); state.updates = []; });
it('approves the selected request and toasts the actual player name', async () => {
  vi.mocked(decideRenewalRequest).mockResolvedValue({ ok: true, fallback: false, error: undefined });
  await confirm();
  expect(decideRenewalRequest).toHaveBeenCalledWith('request', 'approved');
  expect(state.updates).toContainEqual(['request']);
  expect(state.success).toHaveBeenCalledWith('Ali’s renewal request approved');
  expect(state.retry).toHaveBeenCalledOnce();
  expect(state.refresh).toHaveBeenCalledOnce();
});
it('restores the request on failure and does not report success', async () => {
  vi.mocked(decideRenewalRequest).mockResolvedValue({ error: 'Denied' });
  await confirm();
  expect(state.updates).toContainEqual(['request']);
  expect(state.updates).toContainEqual([]);
  expect(state.updates).toContain('Denied');
  expect(state.success).not.toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
});
it('reports an expired offer without claiming that the subscription renewed', async () => {
  vi.mocked(decideRenewalRequest).mockResolvedValue({ ok: true, fallback: true, error: undefined });
  await confirm();
  expect(state.success).toHaveBeenCalledWith('Request approved. The offer expired; review the subscription');
});
