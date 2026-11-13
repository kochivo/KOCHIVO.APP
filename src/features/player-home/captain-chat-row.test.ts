import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainRow } from './components/captain-row';

const state = vi.hoisted(() => ({ data: { latest: { id: 'm', createdAt: '2026-11-13T08:00:00Z', body: 'Actual captain message', voice: false, durationSeconds: 0 }, unread: true } }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: 'ready', data: state.data, retry: vi.fn() }) }));
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainRow, { playerId: 'p', captainId: 'c', name: 'Coach' })));
it('shows latest real text, timestamp and unread dot, and supports voice previews', () => {
  expect(render()).toContain('Actual captain message');
  expect(render()).toContain('2026-11-13T08:00:00Z');
  expect(render()).toContain('data-unheard');
  state.data = { latest: { ...state.data.latest, body: '', voice: true, durationSeconds: 24 }, unread: false };
  expect(render()).toContain('0:24');
  expect(render()).not.toContain('data-unheard');
});
