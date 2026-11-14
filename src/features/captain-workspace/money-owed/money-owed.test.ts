import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { MoneyOwed } from '@/features/billing/server';
import { MoneyOwedView } from './money-owed-view';
import { messages } from './messages';

const data: MoneyOwed = { total: 2000, count: 4, unpriced: 1, rows: [
  { playerId: 'a', name: 'Ali', reason: 'expired', amount: 1200, since: '2026-11-01', days: 3 },
  { playerId: 'b', name: 'B', reason: 'receipt_pending', amount: 800, since: '2026-11-02', days: 2 },
  { playerId: 'c', name: 'C', reason: 'renewal_pending', amount: null, since: '2026-11-03', days: 1 },
  { playerId: 'd', name: 'D', reason: 'partial', amount: 0, since: '2026-11-03', days: 1 },
  { playerId: 'e', name: 'E', reason: 'soon', amount: 1200, since: '2026-11-05', days: 1 },
] };
const render = (value = data, mode: 'home' | 'billing' | 'player' = 'billing', playerId?: string) =>
  renderToStaticMarkup(createElement(MoneyOwedView, { data: value, mode, playerId, locale: 'ar', t: createT(messages, 'ar') }));
it('renders the total, all reason pills, missing-price label and links to player files', () => {
  const html = render();
  for (const text of ['متأخر', 'مستني', 'قريب', 'من غير سعر', 'إيصال مستني مراجعتك', 'باقي دفعة', 'خلص من 3 أيام']) expect(html).toContain(text);
  expect(html).toContain('/captain/players/a');
  expect(html).toContain('2,000');
});
it('links the home stat to billing and shows only the selected player in their file', () => {
  expect(render(data, 'home')).toContain('/captain/billing');
  expect(render(data, 'home')).toContain('جنيه مستني من 4 لاعبين');
  const html = render(data, 'player', 'a');
  expect(html).toContain('1,200');
  expect(html).not.toContain('2,000');
  expect(html).not.toContain('إيصال مستني مراجعتك');
});
it('shows an empty state when nobody owes and still shows upcoming subscriptions', () => {
  expect(render({ rows: [], total: 0, count: 0, unpriced: 0 })).toContain('مفيش مبالغ مستنية');
  expect(render({ ...data, count: 0, total: 0, unpriced: 0, rows: data.rows.slice(4) })).toContain('قريب');
});
