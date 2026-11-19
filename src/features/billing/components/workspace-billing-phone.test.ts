import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceBillingPhoneIncome } from './workspace-billing-phone-income';
import { WorkspaceBillingPhonePayments } from './workspace-billing-phone-payments';
import { WorkspaceBillingPhonePlayer } from './workspace-billing-phone-player';
import { paymentRows } from './workspace-billing-summary';
import type { BillingPlayer } from '../types';

const source = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');

it('shows expiry alongside paid status and labels a used-up session package', () => {
  const today = '2026-11-18';
  const player: BillingPlayer = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-17', status: 'expired',
    phone: null, due: 0, startedOn: '2026-10-18', lastTrainingDate: null, programTitle: null, openTasks: 0,
    lastPayment: { id: 'payment', captain_id: 'captain', player_id: 'p', period_start: '2026-10-18', period_end: '2026-11-17',
      package_id: 'package', days: 30, price_egp: 900, amount_egp: 900, created_at: '2026-10-18T12:00:00Z' } };
  const render = (entry: BillingPlayer) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    paymentRows([entry], [], today).map(row => createElement(WorkspaceBillingPhonePlayer, {
      key: row.player.playerId, row, today, onOpen() {},
    }))));
  expect(render(player)).toContain('Expired');
  expect(render(player)).toContain('>Paid<');
  expect(render({ ...player, accessUntil: '2026-11-19', sessionsLeft: 0 })).toContain('No sessions left');
});

it('bounds the phone income and payment list to the phone breakpoint', () => {
  const billing = source('./workspace-billing.tsx');
  const payments = source('./workspace-payments-table.tsx');
  expect(billing).toContain('WorkspaceBillingPhoneIncome');
  expect(billing).toContain('max-md:hidden');
  expect(payments).toContain('WorkspaceBillingPhonePayments');
  expect(payments).toContain('min-[1024px]:table');
  expect(payments).toContain('max-md:hidden');
});

it('renders the collected, expected and waiting amounts with the real progress value', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspaceBillingPhoneIncome, { income: 21400, expected: 25000, waiting: 1500 })));
  expect(html).toContain('21,400');
  expect(html).toContain('Of 25,000 expected · 1,500 outstanding');
  expect(html).toContain('aria-valuenow="85.6"');
  expect(html).toContain('aria-valuemax="100"');
});

it('keeps player search above results and outside the collapsed details', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspaceBillingPhonePayments, {
      rows: [], filtered: [], filter: 'all', today: '2026-11-18',
      search: createElement('input', { type: 'search' }), onFilter() {}, onOpen() {},
    })));
  expect(html).toMatch(/type="search".*<details/);
  expect(html).not.toMatch(/<details.*type="search"/);
});
