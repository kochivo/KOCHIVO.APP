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
  useRef: () => ({ current: new Set<string>() }),
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
async function resolve(status: 'accepted' | 'declined') {
  const tree = list();
  const ul = tree.props.children[2] as ReactElement<{ children: ReactElement<{ onResolve: (id: string, status: 'accepted' | 'declined') => Promise<void> }>[] }>;
  const card = ul.props.children[0];
  if (!card) throw new Error('Expected a pending request card');
  await card.props.onResolve('request', status);
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
it('restores the request after a failed decision', async () => {
  state.resolve.mockResolvedValue({ error: 'Failed' });
  await resolve('declined');
  const html = renderToStaticMarkup(list());
  expect(html).toContain('role="alert"');
  expect(html).toContain('عمر خالد');
  expect(html).toContain('<li');
});
