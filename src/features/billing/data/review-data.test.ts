import { beforeEach, expect, it, vi } from 'vitest';
import { listRenewalRequests } from './renewal-requests';
import { listPaymentReceipts } from './receipt-actions';

const state = vi.hoisted(() => ({ from: vi.fn(), frozenAt: null as string | null, membershipError: false, archived: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ unstable_rethrow() {} }));
vi.mock('next/cache', () => ({ revalidatePath() {} }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => () => 'Failed' }));
vi.mock('@/core/storage/private-media', () => ({ signedMediaUrl: async () => '/signed' }));
vi.mock('./client', () => ({ captainClient: async () => ({ client: { from: state.from }, captainId: 'captain' }) }));
vi.mock('./receipt-read', () => ({ fetchPendingPaymentReceipts: async () => [
  { id: 'receipt', player_id: 'player', renewal_request_id: null },
] }));

beforeEach(() => {
  state.frozenAt = '2026-11-01T10:00:00Z'; state.membershipError = false; state.archived = false;
  state.from.mockImplementation((table: string) => {
    const data = table === 'player_renewal_requests' ? [{ id: 'request', player_id: 'player', package_id: 'package' }]
      : table === 'profiles' ? [{ id: 'player', full_name: 'Player' }]
        : table === 'captain_packages' ? [{ id: 'package', name: 'Monthly' }]
          : [{ player_id: 'player', frozen_at: state.frozenAt }];
    const result = () => ({ data, error: table === 'coach_clients' && state.membershipError ? new Error('Unavailable') : null });
    const query = { select: () => query, eq: () => query, is: () => query, in: () => query, order: () => query,
      single: async () => ({ ...result(), data: data[0], error: table === 'coach_clients' && state.archived ? new Error('No active membership') : result().error }),
      maybeSingle: async () => ({ ...result(), data: state.archived ? null : data[0] }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve) };
    return query;
  });
});

it('includes current frozen state in renewal review data', async () => {
  expect((await listRenewalRequests()).data?.[0]).toMatchObject({ id: 'request', frozenAt: state.frozenAt });
  state.frozenAt = null;
  expect((await listRenewalRequests()).data?.[0]).toMatchObject({ frozenAt: null });
});
it('includes current frozen state in receipt review data', async () => {
  expect((await listPaymentReceipts()).data?.[0]).toMatchObject({ id: 'receipt', frozenAt: state.frozenAt });
  state.frozenAt = null;
  expect((await listPaymentReceipts()).data?.[0]).toMatchObject({ frozenAt: null });
});
it('fails the review load when frozen state cannot be read', async () => {
  state.membershipError = true;
  expect((await listRenewalRequests()).error).toBe('Failed');
  expect((await listPaymentReceipts()).error).toBe('Failed');
});
it('keeps archived-player receipts visible for declining', async () => {
  state.archived = true;
  expect((await listPaymentReceipts()).data?.[0]).toMatchObject({ id: 'receipt', frozenAt: null });
});
