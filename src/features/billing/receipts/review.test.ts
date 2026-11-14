import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { PaymentReceipt, ReceiptReview } from './types';
import { ReceiptReviewRow } from './review-row';
import { PlayerReceipt } from './player-receipt';
import { CaptainReceipts } from './captain-receipts';

const state = vi.hoisted(() => ({ data: undefined as unknown, error: undefined as unknown }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: state.data, error: state.error, retry() {} }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('../data/receipt-actions', () => ({ loadPlayerReceipt() {}, listPaymentReceipts() {}, decidePaymentReceipt() {} }));
const receipt: ReceiptReview = {
  id: 'receipt', player_id: 'player', captain_id: 'captain', renewal_request_id: null, amount_egp: 800,
  method: 'instapay', photo_path: 'private/photo.jpg', status: 'pending', decline_reason: null, revision: 1,
  created_at: '2026-11-14T10:00:00Z', decided_at: null, name: 'Player name', url: '/signed-photo', packageName: null,
};
const render = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, child));
beforeEach(() => { state.data = undefined; state.error = undefined; });
it('shows real amount, method and photo and asks for a period only for unlinked receipts', () => {
  const props = { receipt, first: true, busy: false, onDecide: async () => {} };
  const html = render(createElement(ReceiptReviewRow, props));
  expect(html).toContain('EGP 800'); expect(html).toContain('InstaPay'); expect(html).toContain('/signed-photo');
  expect(html).toContain('Renewal length in days'); expect(html).toContain('disabled=""');
  const linked = render(createElement(ReceiptReviewRow, { ...props, receipt: { ...receipt, renewal_request_id: 'request', packageName: 'Monthly' } }));
  expect(linked).toContain('Package: Monthly'); expect(linked).not.toContain('Renewal length in days');
  expect(linked).not.toContain('disabled=""');
});
it('shows a declined reason and a new-receipt action to the player', () => {
  const declined: PaymentReceipt = { ...receipt, status: 'declined', decline_reason: 'Amount not visible' };
  state.data = { data: { playerId: 'player', captainId: 'captain', receipt: declined } };
  const html = render(createElement(PlayerReceipt, { renewalId: null }));
  expect(html).toContain('Receipt declined: Amount not visible'); expect(html).toContain('Send a new receipt');
});
it('shows pending replacement and accepted confirmation to the player', () => {
  state.data = { data: { playerId: 'player', captainId: 'captain', receipt } };
  expect(render(createElement(PlayerReceipt, { renewalId: null }))).toContain('Replace receipt photo');
  state.data = { data: { playerId: 'player', captainId: 'captain', receipt: { ...receipt, status: 'accepted' } } };
  expect(render(createElement(PlayerReceipt, { renewalId: null }))).toContain('Receipt accepted and subscription renewed');
});
it('provides loading, error and empty states without invented receipt rows', () => {
  expect(render(createElement(CaptainReceipts))).toContain('Loading receipts');
  state.error = new Error('offline');
  expect(render(createElement(CaptainReceipts))).toContain('Could not load receipts');
  state.error = undefined; state.data = { data: [] };
  expect(render(createElement(CaptainReceipts))).toContain('No receipts awaiting review');
});
