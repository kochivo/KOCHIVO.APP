import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspacePaymentsTable } from './components/workspace-payments-table';
import type { BillingPlayer, Payment } from './types';

const payment: Payment = { id: 'renewal', captain_id: 'captain', player_id: 'player',
  days: 30, period_start: '2026-11-17', period_end: '2026-12-16',
  created_at: '2026-11-17T12:00:00Z', amount_egp: 0, price_egp: 500, method: 'instapay' };
const player: BillingPlayer = { playerId: 'player', fullName: 'Hesham', accessUntil: '2026-12-16',
  startedOn: '2026-11-17', lastTrainingDate: null, programTitle: null, openTasks: 0,
  status: 'active', phone: null, due: 0, lastPayment: null };
function render(lastPayment: Payment | null, due = 0) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(WorkspacePaymentsTable, { players: [{ ...player, lastPayment, due }], packages: [], today: '2026-11-17' })));
}
it('includes an active player without a payment and offers payment recording', () => {
  const html = render(null);
  expect(html).toContain('Hesham');
  expect(html).toContain('No payment recorded');
  expect(html).toContain('Record payment');
});
it.each([null, 0])('uses the same no-amount label and hides a method for %s', amount => {
  const html = render({ ...payment, amount_egp: amount });
  expect(html).toContain('No amount');
  expect(html).not.toContain('InstaPay');
  expect(html).toContain('Not paid');
});
it.each([
  [0, 500, 'Paid in full', '500'],
  [100, 150, 'Partly paid', '250'],
  [500, 0, 'Paid in full', '500'],
] as const)('adds collections to %s plus %s and derives period status', (amount, collected, status, total) => {
  const html = render({ ...payment, amount_egp: amount, collected_egp: collected });
  expect(html).toContain(`>${total}</td>`);
  expect(html).toContain(status);
});
it('uses the method of a later collection and ignores debts from other periods', () => {
  const html = render({ ...payment, amount_egp: 0, collected_egp: 500, collection_method: 'cash' }, 200);
  expect(html).toContain('Paid in full');
  expect(html).toContain('Cash');
  expect(html).not.toContain('InstaPay');
});
