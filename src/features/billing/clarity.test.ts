import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { messages as workspace } from './workspace/messages';
import { messages as payments } from './payments/messages';
import { WorkspaceBillingRow } from './components/workspace-billing-row';
import type { BillingPlayer } from './types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./data/pt-actions', () => ({ setPlayerFrozen: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());

it.each([1, 2, 5, 11, 100])('pluralizes player limits and overdue counts for %s', n => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const style of ['egyptian', 'standard'] as const) {
    const unit = n >= 2 && n <= 10 ? 'لاعبين' : 'لاعب';
    expect(createT(messages, 'ar', style)('usage', { used: 1, n, count: n })).toBe(`1 من ${n} ${unit}`);
    expect(createT(workspace, 'ar', style)('usage', { used: 1, n, limit: n })).toBe(`1 من ${n} ${unit}`);
    expect(createT(workspace, 'ar', style)('usageTail', { n, limit: n })).toBe(`من ${n} ${unit}`);
    expect(createT(payments, 'ar', style)('summary', { n, count: n, paid: 0, due: 0, ending: 0 })).toContain(`من ${n} ${unit} ·`);
  }
  const unit = n === 1 ? 'player' : 'players';
  expect(createT(workspace, 'en')('usageTail', { n, limit: n })).toBe(`of ${n} ${unit}`);
  expect(createT(payments, 'en')('summary', { n, count: n, paid: 0, due: 0, ending: 0 })).toContain(`from ${n} ${unit} ·`);
});

it.each([250, 0, null])('shows a currency only for a positive billing row price (%s)', price => {
  const player: BillingPlayer = { playerId: 'player', fullName: 'Player', phone: null, accessUntil: '2026-12-13', due: 0,
    startedOn: '2026-11-13', lastTrainingDate: null, programTitle: null, openTasks: 0, status: 'active',
    lastPayment: { id: 'payment', captain_id: 'captain', player_id: 'player', period_start: '2026-11-13', period_end: '2026-12-13',
      package_id: null, days: 30, price_egp: price, amount_egp: price, created_at: '2026-11-13T12:00:00Z' } };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(WorkspaceBillingRow, { player, today: '2026-11-13', packages: [] })));
  expect(html).toContain('30 days');
  if (price) expect(html).toContain('250 EGP');
  else expect(html).not.toContain(' · 0');
});
it('shows waiting instead of an overdue countdown for an awaiting player', () => {
  const player: BillingPlayer = { playerId: 'player', fullName: 'Player', phone: null, accessUntil: '2026-11-01', due: 0,
    startedOn: '2026-11-01', lastTrainingDate: null, programTitle: null, openTasks: 0, status: 'active',
    lastPayment: null, awaitingPlansAt: '2026-11-01T10:00:00Z' };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(WorkspaceBillingRow, { player, today: '2026-11-13', packages: [] })));
  expect(html).toContain('Waiting for plans');
  expect(html).not.toContain('days overdue');
});
