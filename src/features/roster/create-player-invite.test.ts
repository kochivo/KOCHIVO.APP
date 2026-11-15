import { beforeEach, expect, it, vi } from 'vitest';
import { createPlayerInviteAt } from './data/create-player-invite-internal';
import { createPlayerInvite } from './data/create-player-invite';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./data/client', () => ({ rosterClient: async () => ({ rpc: mocks.rpc }) }));
const input = { name: ' Ali ', whatsapp: '01001234567', packageId: null, kind: 'days', quantity: 30,
  price: 400, paid: 150, freeTrial: false, startsOn: '2026-11-03' };
const now = new Date('2026-11-03T10:00Z');
beforeEach(() => { vi.resetAllMocks(); });
it.each([{ name: '' }, { name: 'x'.repeat(61) }, { whatsapp: 'abc' }, { quantity: 366 },
  { kind: 'sessions', quantity: 201 }, { price: 2.5 }, { paid: 401 }, { startsOn: '2026-02-30' },
  { startsOn: '2027-01-03' }, { startsOn: '2026-10-03' }, { packageId: 'bad' }])('rejects invalid input %j before RPC', async patch => {
  expect(await createPlayerInviteAt({ ...input, ...patch }, now)).toEqual({ error: 'راجع بيانات الدعوة' });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('normalizes values and invalidates roster and billing after a successful RPC', async () => {
  mocks.rpc.mockResolvedValue({ data: 'code', error: null });
  expect(await createPlayerInviteAt(input, now)).toEqual({ code: 'code' });
  expect(mocks.rpc).toHaveBeenCalledWith('create_player_invite', { p_name: 'Ali', p_whatsapp: '201001234567',
    p_package: null, p_kind: 'days', p_quantity: 30, p_price_egp: 400, p_paid_egp: 150, p_free_trial: false, p_starts_on: '2026-11-03' });
  expect(mocks.revalidate.mock.calls).toEqual([['/captain/players'], ['/captain/billing']]);
});
it.each([
  [{ code: 'P0001', message: 'free plan allows 5 active players' }, 'وصلت للحد الأقصى للاعبين'],
  [{ code: 'P0002', message: 'package not found' }, 'الباقة مش موجودة. اختار باقة تانية'],
  [{ code: '22023', message: 'invalid invite values' }, 'راجع بيانات الدعوة'],
  [{ code: '42501', message: 'non-demo captain required' }, 'الدعوات للكباتن بس ومن غير ديمو'],
  [{ code: 'unknown', message: 'failure' }, 'الدعوة متعملتش. جرّب تاني'],
])('maps RPC error %j to friendly text', async (error, message) => {
  mocks.rpc.mockResolvedValue({ data: null, error });
  expect(await createPlayerInviteAt(input, now)).toEqual({ error: message });
});
it('handles network failure and exposes a server action', async () => {
  mocks.rpc.mockRejectedValue(new Error('offline'));
  expect(await createPlayerInviteAt(input, now)).toEqual({ error: 'الدعوة متعملتش. جرّب تاني' });
  expect(await createPlayerInvite({})).toEqual({ error: 'راجع بيانات الدعوة' });
});
it('sends selected assessments and the explicit gate choice through v2', async () => {
  mocks.rpc.mockResolvedValue({ data: 'code', error: null });
  const formIds = ['00000000-0000-7000-8000-000000000001'];
  expect(await createPlayerInviteAt({ ...input, formIds, gate: false }, now)).toEqual({ code: 'code' });
  expect(mocks.rpc).toHaveBeenCalledWith('create_player_invite_v2', expect.objectContaining({ p_form_ids: formIds, p_gate: false }));
});
it('rejects duplicate and excessive assessment ids before creating an invite', async () => {
  const id = '00000000-0000-7000-8000-000000000001';
  for (const formIds of [[id,id], Array.from({ length: 6 }, () => id)])
    expect(await createPlayerInviteAt({ ...input, formIds }, now)).toEqual({ error: 'راجع بيانات الدعوة' });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
