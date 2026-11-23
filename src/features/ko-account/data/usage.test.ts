import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as entry from '@/features/ko-entry/server';
import * as account from './account';
import type { KoActor } from './account';
import { postKoAccountChat } from './route';
import { refundCredit, refundTakenCredit, refundTakenUsage, refundUsage } from './usage';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));
vi.mock('./facts', () => ({ loadFacts: async () => undefined, appendMemoryFacts: (facts: string) => facts }));
vi.mock('./memory', () => ({ loadChatMemory: async () => ({ learning: false, memories: [] }), saveMemory: async () => undefined }));

beforeEach(() => vi.stubEnv('KO_ANSWER', ''));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const actorWithRpc = (rpc: ReturnType<typeof vi.fn>) => ({ id: 'pilot', role: 'player', db: { rpc } }) as unknown as KoActor;

it('refunds usage once and reports an already-refunded key as not applied', async () => {
  const rpc = vi.fn(async (name: string) => ({ data: name === 'ko_usage_refund', error: null }));
  const actor = actorWithRpc(rpc);
  expect(await refundUsage(actor, { day: '2026-11-19', kind: 'message', key: '00000000-0000-7000-8000-000000000001' })).toBe(true);
  expect(rpc).toHaveBeenCalledWith('ko_usage_refund', {
    p_day: '2026-11-19', p_kind: 'message', p_key: '00000000-0000-7000-8000-000000000001',
  });
  rpc.mockResolvedValueOnce({ data: false, error: null });
  expect(await refundUsage(actor, { day: '2026-11-19', kind: 'message', key: '00000000-0000-7000-8000-000000000001' })).toBe(false);
});

it('refunds a credit once and reports an already-refunded token as not applied', async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const actor = actorWithRpc(rpc);
  expect(await refundCredit(actor, { month: '2026-11-01', token: 'token' })).toBe(true);
  expect(rpc).toHaveBeenCalledWith('ko_credit_refund', { p_month: '2026-11-01', p_token: 'token' });
  rpc.mockResolvedValueOnce({ data: false, error: null });
  expect(await refundCredit(actor, { month: '2026-11-01', token: 'token' })).toBe(false);
});

it('swallows refund RPC failures instead of throwing', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const rpc = vi.fn(async () => ({ data: null, error: { code: 'XX000', message: 'boom' } }));
  const actor = actorWithRpc(rpc);
  expect(await refundUsage(actor, { day: '2026-11-19', kind: 'photo', key: '00000000-0000-7000-8000-000000000002' })).toBe(false);
  expect(await refundCredit(actor, { month: '2026-11-01', token: 'token' })).toBe(false);
  expect(warn).toHaveBeenCalledTimes(2);
});

it('does not refund usage that was never taken', async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const actor = actorWithRpc(rpc);
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T12:00:00Z'));
  expect(await refundTakenUsage(actor, false, Date.now(), false, '00000000-0000-7000-8000-000000000003')).toBe(false);
  expect(await refundTakenCredit(actor, false, Date.now(), 'token')).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
});

it('refunds taken usage with the Cairo day and kind of the request', async () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const actor = actorWithRpc(rpc);
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T12:00:00Z'));
  expect(await refundTakenUsage(actor, true, Date.now(), true, '00000000-0000-7000-8000-000000000004')).toBe(true);
  expect(rpc).toHaveBeenCalledWith('ko_usage_refund', {
    p_day: '2026-11-19', p_kind: 'photo', p_key: '00000000-0000-7000-8000-000000000004',
  });
  expect(await refundTakenCredit(actor, true, Date.now(), 'token')).toBe(true);
  expect(rpc).toHaveBeenCalledWith('ko_credit_refund', { p_month: '2026-11-01', p_token: 'token' });
});

function setupRoute(status: number) {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', 'm'.repeat(32));
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'ko_rate_take' ? true : name === 'ko_usage_tier' ? [{ captain_id: 'captain', tier: 'entry' }]
      : name === 'my_captain_id' ? null : name === 'ko_usage_refund' ? true : name === 'ko_secret_check' ? true : 'ok',
    error: null,
  }));
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T12:00:00Z'));
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query),
    limit: async () => ({ data: [], error: null }),
  };
  vi.spyOn(account, 'getKoActor').mockResolvedValue({ id: 'pilot', role: 'player', db: { rpc, from: () => query } } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set(['pilot']), secret: 's'.repeat(32), key: 'key',
  });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })));
  return rpc;
}

function post(text: string) {
  const body = new FormData();
  body.set('locale', 'en');
  body.set('text', text);
  return postKoAccountChat(new Request('https://ko.test/api/ko', {
    method: 'POST', body, headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
  }));
}

it.each([429, 503])('refunds the taken usage exactly once when Gemini answers %s', async status => {
  const rpc = setupRoute(status);
  const response = await post('Help');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(status === 429 ? {
    kind: 'message', text: 'KO is busy today. Try again in a bit. If it still doesn’t work, try tomorrow morning.',
    quick: ['Today’s workout', 'Today’s meals', 'My progress'],
  } : { kind: 'message', text: 'KO is busy right now. Try again in a minute.' });
  const refunds = rpc.mock.calls.filter(([name]) => name === 'ko_usage_refund');
  expect(refunds).toEqual([['ko_usage_refund', { p_day: '2026-11-19', p_kind: 'message', p_key: expect.any(String) }]]);
  expect(rpc.mock.calls.filter(([name]) => name === 'ko_usage_take')).toHaveLength(1);
});

it('refunds the taken usage exactly once when Gemini throws', async () => {
  const rpc = setupRoute(500);
  const response = await post('Help');
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'failed' });
  expect(rpc.mock.calls.filter(([name]) => name === 'ko_usage_refund')).toHaveLength(1);
});
