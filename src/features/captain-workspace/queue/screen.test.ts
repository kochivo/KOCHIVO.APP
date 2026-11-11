import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { QueueScreen } from './queue-screen';
import { QueueRow } from './queue-row';
import { queueRow } from './model';
const state = vi.hoisted(() => ({ data: undefined as unknown, error: undefined as unknown, moreError: false }));
vi.mock('./use-queue', () => ({ useQueue: () => ({ ...state, retry: () => {}, more: () => {}, pending: false }) }));
vi.mock('@/features/inbox', () => ({ triage: () => ({ flags: [], group: 'routine' }), FlagChip: () => null }));
beforeEach(() => { state.data = undefined; state.error = undefined; state.moreError = false; });
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(QueueScreen)));
const item = { id: 'check', player_id: 'p', player_name: 'Ahmed', kind: 'checkin' as const,
  created_at: '2026-11-10T11:00:00Z', reviewed_at: null, reply: null,
  week_start: '2026-11-07', body_weight_kg: 81, waist_cm: 84, notes: null };
it('shows loading before data, and a retryable error if the initial read fails', () => {
  expect(render()).toContain('Loading requests');
  state.error = new Error('offline');
  expect(render()).toContain('role="alert"');
  expect(render()).toContain('Try again');
});
it('shows an empty queue and only offers load more while a cursor exists', () => {
  const page = { items: [], previous: {}, cursor: null as null | { created_at: string; id: string }, renewalCursor: null, at: '2026-11-11T12:00:00Z' };
  state.data = { pages: [page], reviews: [], triage: { history: [], dailyChecks: [] },
    counts: { needsReply: 0, late: 0, reviewed: 0, reviewedWeek: 0, all: 0 } };
  expect(render()).toContain('No requests here');
  expect(render()).not.toContain('Load more');
  page.cursor = { created_at: item.created_at, id: item.id };
  expect(render()).toContain('Load more');
  state.moreError = true;
  expect(render()).toContain('role="alert"');
  expect(render()).toContain('Load more');
});
it('isolates deltas LTR in Arabic and links renewal review to existing player billing', () => {
  const row = queueRow(item, { source: { kind: 'checkin', id: 'old', at: '2026-11-01T12:00:00Z' }, facts: { weight: 82 } }, new Date('2026-11-11T12:00:00Z'));
  const html = renderToStaticMarkup(createElement(QueueRow, { row, locale: 'ar', onReview: () => {} }));
  expect(html).toContain('<bdi dir="ltr">الوزن -1 كجم</bdi>');
  expect(html).toContain('راجِع');
  const renewal = queueRow({ ...item, kind: 'renewal', access_until: '2026-11-15' }, undefined, new Date('2026-11-11T12:00:00Z'));
  expect(renderToStaticMarkup(createElement(QueueRow, { row: renewal, locale: 'en', onReview: () => {} }))).toContain('href="/captain/players/p"');
});
