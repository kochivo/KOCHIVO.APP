import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ eq: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock('@/core/i18n/server', async () => {
  const { createT } = await import('@/core/i18n/messages');
  return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') };
});
vi.mock('./data/client', () => ({ captainClient: async () => {
  const query = { eq: state.eq, order: state.order, range: state.range };
  state.eq.mockReturnValue(query); state.order.mockReturnValue(query);
  return { captainId: 'owner', client: { from: () => ({ select: () => query }) } };
} }));
beforeEach(() => { vi.clearAllMocks(); state.range.mockResolvedValue({ data: [], error: null }); });
it('scopes both histories to the captain and player with deterministic pagination', async () => {
  const { loadPaymentHistory } = await import('./data/history');
  const id = '00000000-0000-4000-8000-000000000001';
  expect(await loadPaymentHistory(id, { payments: 50, collections: 0 })).toEqual({ payments: [], collections: [], more: false, next: { payments: 50, collections: 0 } });
  expect(state.eq.mock.calls).toEqual([['captain_id', 'owner'], ['player_id', id], ['captain_id', 'owner'], ['player_id', id]]);
  expect(state.range.mock.calls).toEqual([[50, 100], [0, 50]]);
});
it('rejects invalid players and page offsets before querying', async () => {
  const { loadPaymentHistory } = await import('./data/history');
  await expect(loadPaymentHistory('bad', { payments: 0, collections: 0 })).rejects.toThrow();
  await expect(loadPaymentHistory('00000000-0000-4000-8000-000000000001', { payments: -1, collections: 0 })).rejects.toThrow();
  expect(state.range).not.toHaveBeenCalled();
});
it('exposes history query failures for retry', async () => {
  state.range.mockResolvedValue({ data: null, error: { message: 'denied' } });
  const { loadPaymentHistory } = await import('./data/history');
  await expect(loadPaymentHistory('00000000-0000-4000-8000-000000000001', { payments: 0, collections: 0 })).rejects.toThrow("Couldn't load payments. Try again");
});

it('paginates the merged timeline so old collections never precede newer renewals', async () => {
  const payments = Array.from({ length: 60 }, (_, i) => ({ id: `payment-${String(i).padStart(2, '0')}`, created_at: '2026-11-12T12:00:00Z', amount_egp: 50 }));
  state.range.mockResolvedValueOnce({ data: payments, error: null }).mockResolvedValueOnce({
    data: [{ id: 'old', created_at: '2026-10-01T12:00:00Z', amount_egp: 10 }], error: null,
  });
  const { loadPaymentHistory } = await import('./data/history');
  const result = await loadPaymentHistory('00000000-0000-4000-8000-000000000001', { payments: 0, collections: 0 });
  expect(result.payments).toHaveLength(50); expect(result.collections).toHaveLength(0); expect(result.more).toBe(true);
  expect(result.next).toEqual({ payments: 50, collections: 0 });
  state.range.mockResolvedValueOnce({ data: payments.slice(50), error: null }).mockResolvedValueOnce({
    data: [{ id: 'old', created_at: '2026-10-01T12:00:00Z', amount_egp: 10 }], error: null,
  });
  const next = await loadPaymentHistory('00000000-0000-4000-8000-000000000001', result.next);
  expect(next.payments).toHaveLength(10); expect(next.collections).toHaveLength(1); expect(next.more).toBe(false);
});
