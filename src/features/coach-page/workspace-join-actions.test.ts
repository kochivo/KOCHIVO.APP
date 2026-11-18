import type * as React from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { JoinRequestsList } from './components/join-requests-list';

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, resolve: vi.fn(), success: vi.fn() }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (next: unknown) => {
      state.values[index] = typeof next === 'function' ? next(state.values[index]) : next;
    }];
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useLayoutEffect: () => {},
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar'), useLocale: () => 'ar' }));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/join-requests', () => ({ resolveJoinRequest: state.resolve }));
vi.mock('@/features/billing', () => ({ BillingManagerLoader: () => null }));

const rows = [{ id: 'request', full_name: 'عمر خالد', created_at: '2026-11-14T10:00:00Z' }];
function list() {
  state.cursor = 0;
  return JoinRequestsList({ rows, workspace: true, now: Date.parse('2026-11-14T12:00:00Z') });
}
function resolve(status: 'accepted' | 'declined') {
  const tree = list();
  const ul = tree.props.children[2] as ReactElement<{ children: ReactElement<{ onResolve: (id: string, status: 'accepted' | 'declined') => Promise<void> }>[] }>;
  const card = ul.props.children[0];
  if (!card) throw new Error('Expected a pending request card');
  return card.props.onResolve('request', status);
}
beforeEach(() => { state.values = []; state.cursor = 0; state.resolve.mockReset(); state.success.mockReset(); });

it('removes accepted requests and announces acceptance only', async () => {
  state.resolve.mockResolvedValue({ ok: true, playerId: 'player' });
  await resolve('accepted');
  expect(state.resolve).toHaveBeenCalledWith('request', 'accepted');
  const html = renderToStaticMarkup(list());
  expect(state.success).toHaveBeenCalledWith('اتقبل عمر خالد');
  expect(html).not.toContain('<li');
});
it('keeps the request after a failed decision', async () => {
  state.resolve.mockResolvedValue({ error: 'Failed' });
  await resolve('declined');
  const html = renderToStaticMarkup(list());
  expect(html).toContain('role="alert"');
  expect(html).toContain('عمر خالد');
  expect(html).toContain('<li');
});

it('keeps the request and its action controls in place while resolving', async () => {
  let finish: (value: { ok: true }) => void = () => {};
  state.resolve.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const decision = resolve('declined');
  const html = renderToStaticMarkup(list());
  expect(html).toContain('data-join-row="request"');
  expect(html).toContain('aria-busy="true"');
  expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
  finish({ ok: true });
  await decision;
  expect(renderToStaticMarkup(list())).not.toContain('data-join-row="request"');
});
