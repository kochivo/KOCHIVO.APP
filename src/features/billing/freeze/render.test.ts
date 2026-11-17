import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerFreeze } from './player-freeze';
import { CaptainFreezeRequests } from './captain-requests';
import type { FreezeState } from './types';

const state = vi.hoisted(() => ({ data: undefined as unknown, error: undefined as unknown }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ ...state, retry() {}, mutate() {} }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('../data/freeze-requests', () => ({ loadFreezeState() {}, sendFreezeRequest() {}, cancelFreezeRequest() {}, listFreezeRequests() {}, decideFreezeRequest() {} }));

const render = (captain = false) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  captain ? createElement(CaptainFreezeRequests) : createElement(PlayerFreeze)));
const eligible: FreezeState = { captainId: 'captain', remaining: 4, pendingId: null, frozenUntil: null };
beforeEach(() => { state.data = { data: eligible }; state.error = undefined; });

it('offers a request only when days remain and shows pending cancellation', () => {
  expect(render()).toContain('Request a freeze');
  state.data = { data: { ...eligible, remaining: 0 } };
  expect(render()).not.toContain('Request a freeze');
  state.data = { data: { ...eligible, pendingId: 'request' } };
  const html = render();
  expect(html).toContain('Your request is waiting for your captain');
  expect(html).toContain('Cancel request');
  expect(html).not.toContain('Request a freeze');
});
it('shows a frozen return date without offering another request', () => {
  state.data = { data: { ...eligible, frozenUntil: '2026-11-10' } };
  expect(render()).toContain('Frozen until');
  expect(render()).toContain('November');
  expect(render()).not.toContain('Request a freeze');
});
it('renders loading, retry and captain empty states', () => {
  state.data = undefined;
  expect(render()).toContain('role="status"');
  state.error = new Error('Unavailable');
  expect(render()).toContain('Try again');
  state.data = { data: [] }; state.error = undefined;
  expect(render(true)).toContain('No freeze requests');
});
it('shows the captain the requested duration, note and both decisions', () => {
  state.data = { data: [{ id: 'request', name: 'Salma', days: 3, note: 'Travel' }] };
  const html = render(true);
  for (const text of ['Salma', '3 days', 'Travel', 'Approve', 'Decline']) expect(html).toContain(text);
});
