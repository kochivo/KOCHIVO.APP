import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { decidePaymentReceipt, submitPaymentReceipt } from '../data/receipt-actions';

const state = vi.hoisted(() => ({ server: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: state.server }));
vi.mock('@/core/i18n/server', () => ({ getT: async (dictionary: Messages) => createT(dictionary, 'en') }));
vi.mock('next/navigation', () => ({ unstable_rethrow() {} }));
vi.mock('next/cache', () => ({ revalidatePath() {} }));
vi.mock('../data/client', () => ({ captainClient: async () => ({ client: { rpc: state.rpc }, captainId: 'captain' }) }));
vi.mock('../data/receipt-read', () => ({ fetchPendingPaymentReceipts: async () => [] }));
beforeEach(() => { vi.clearAllMocks(); state.rpc.mockResolvedValue({ data: undefined, error: null }); });
const id = '019a5000-0000-7000-8000-000000000001';
const photo = `${id}/${id}/${id}.jpg`;
it('rejects invalid uploads before reaching Supabase', async () => {
  for (const patch of [{ amount: 0 }, { amount: 100001 }, { method: 'card' }, { id: 'invalid' }, { status: 'accepted' }]) {
    expect((await submitPaymentReceipt({ id, captainId: id, amount: 800, method: 'cash', photo, renewalId: null, ...patch })).error)
      .toBe('Could not save receipt. Try again');
  }
  expect(state.server).not.toHaveBeenCalled();
});
it('passes the reviewed version, photo and translated confirmation to atomic acceptance', async () => {
  expect(await decidePaymentReceipt({ id, photo, revision: 2, days: 30 })).toEqual({ data: true, error: undefined });
  expect(state.rpc).toHaveBeenCalledWith('accept_payment_receipt', { p_receipt: id, p_days: 30, p_package: null,
    p_photo: photo, p_revision: 2, p_message: 'Your payment receipt was accepted. View your payment and subscription details in the app.' });
});
it('requires a one-line decline reason and forwards the reviewed version', async () => {
  for (const reason of ['', '  ', 'a\nb', 'x'.repeat(201)]) expect((await decidePaymentReceipt({ id, photo, revision: 2, days: null, reason })).error).toBeTruthy();
  expect(state.rpc).not.toHaveBeenCalled();
  await decidePaymentReceipt({ id, photo, revision: 2, days: null, reason: ' Photo unclear ' });
  expect(state.rpc).toHaveBeenCalledWith('decline_payment_receipt', { p_receipt: id, p_photo: photo, p_revision: 2, p_reason: 'Photo unclear' });
});
it('returns a translated overpayment error when the debt changed after review', async () => {
  state.rpc.mockResolvedValue({ data: null, error: { message: 'more than the player owes', code: '22023' } });
  expect((await decidePaymentReceipt({ id, photo, revision: 1, days: null })).error)
    .toBe('Receipt exceeds the remaining debt. Ask for a receipt with the correct amount');
});
