import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { MoneyOwed } from '@/features/billing/server';
import { MoneyOwedView } from './money-owed-view';
import { messages } from './messages';

afterEach(() => vi.unstubAllEnvs());

it.each([
  ['ar', 'egyptian', ['جنيه مستني من لاعب واحد', 'جنيه مستني من لاعبين', 'جنيه مستني من 3 لاعبين', 'جنيه مستني من 11 لاعب', 'جنيه مستني من 100 لاعب'],
    ['خلص امبارح', 'خلص من يومين', 'خلص من 3 أيام', 'خلص من 11 يوم', 'خلص من 100 يوم']],
  ['ar', 'standard', ['جنيه مستحق من لاعب واحد', 'جنيه مستحق من لاعبين', 'جنيه مستحق من 3 لاعبين', 'جنيه مستحق من 11 لاعبًا', 'جنيه مستحق من 100 لاعب'],
    ['انتهى أمس', 'انتهى منذ يومين', 'انتهى منذ 3 أيام', 'انتهى منذ 11 يومًا', 'انتهى منذ 100 يوم']],
  ['en', 'egyptian', ['EGP waiting from 1 player', 'EGP waiting from 2 players', 'EGP waiting from 3 players', 'EGP waiting from 11 players', 'EGP waiting from 100 players'],
    ['Expired yesterday', 'Expired 2 days ago', 'Expired 3 days ago', 'Expired 11 days ago', 'Expired 100 days ago']],
] as const)('inflects money owed and expiry in %s (%s)', (locale, style, total, expired) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const t = createT(messages, locale, style);
  const counts = [1, 2, 3, 11, 100];
  expect(counts.map(n => t('total', { n, count: n }))).toEqual(total);
  expect(counts.map(n => t('expired', { n, count: n }))).toEqual(expired);
});

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
it('uses a shared total strip and distinguishes upcoming and overdue row tones', () => {
  const html = render();
  expect(html).toContain('hairline-cells');
  expect(html).toContain('tone-warn');
  expect(html).toContain('tone-danger');
  expect(html).toContain('tone-info');
  expect(html).toContain('min-h-14');
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
  const html = render({ rows: [], total: 0, count: 0, unpriced: 0 });
  expect(html).toContain('مفيش مبالغ مستنية');
  expect(html).not.toContain('جنيه مستني من 0');
  expect(render({ ...data, count: 0, total: 0, unpriced: 0, rows: data.rows.slice(4) })).toContain('قريب');
});
it('keeps the original player rows and status pills', () => {
  const html = render(data, 'player', 'a');
  expect(html).toContain('class="flex flex-wrap items-center gap-stack p-card"');
  expect(html).toContain('class="rounded-full px-stack py-inline text-xs bg-warn-soft text-warn"');
  expect(html).not.toContain('tone-danger');
  expect(html).not.toContain('hairline-cells');
});
