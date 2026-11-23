import { createHmac } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
import type { KoActor } from './data/account';
import { verifyKoApprovalSecret, verifyKoSecrets } from './data/secret-check';

vi.mock('server-only', () => ({}));

const challenge = 'ko-secret-check';
const approval = (n: string) => 'a'.repeat(31) + n;
const meal = (n: string) => 'm'.repeat(31) + n;

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

// The mocked RPC answers the way the real ko_secret_check does: true only
// when the MAC matches the database-side secret for the requested kind.
function setup(dbSecrets: { approval: string; meal: string }, fail?: 'error' | 'throws') {
  const rpc = vi.fn(async (name: string, args: { p_kind: string; p_challenge: string; p_mac: string }) => {
    if (fail === 'throws') throw new Error('Connection failed');
    if (fail === 'error') return { data: null, error: { message: 'boom' } };
    const expected = createHmac('sha256', args.p_kind === 'approval' ? dbSecrets.approval : dbSecrets.meal)
      .update(args.p_challenge).digest('hex');
    return { data: args.p_mac === expected, error: null };
  });
  const actor = { id: 'pilot', role: 'player', db: { rpc } } as unknown as KoActor;
  return { actor, rpc };
}

function expectMac(rpc: ReturnType<typeof vi.fn>, kind: 'approval' | 'meal_receipt', secret: string) {
  const call = rpc.mock.calls.find(([, args]) => (args as { p_kind: string }).p_kind === kind);
  expect(call?.[0]).toBe('ko_secret_check');
  expect(call?.[1]).toEqual({
    p_kind: kind, p_challenge: challenge,
    p_mac: createHmac('sha256', secret).update(challenge).digest('hex'),
  });
}

it('returns [] when both secrets match the database', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('1'));
  const { actor, rpc } = setup({ approval: approval('1'), meal: meal('1') });
  expect(await verifyKoSecrets(actor, { secret: approval('1') })).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(2);
  expectMac(rpc, 'approval', approval('1'));
  expectMac(rpc, 'meal_receipt', meal('1'));
});

it('returns the mismatching name when only the approval secret disagrees', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('2'));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { actor } = setup({ approval: approval('9'), meal: meal('2') });
  expect(await verifyKoSecrets(actor, { secret: approval('2') })).toEqual(['KO_APPROVAL_SECRET']);
  expect(warn).toHaveBeenCalledWith('KO secrets do not match the database:', 'KO_APPROVAL_SECRET');
});

it('returns both names when both secrets disagree', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('3'));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { actor } = setup({ approval: approval('9'), meal: meal('9') });
  expect(await verifyKoSecrets(actor, { secret: approval('3') }))
    .toEqual(['KO_APPROVAL_SECRET', 'KO_MEAL_RECEIPT_SECRET']);
  expect(warn).toHaveBeenCalledWith(
    'KO secrets do not match the database:', 'KO_APPROVAL_SECRET, KO_MEAL_RECEIPT_SECRET');
});

it('treats a missing meal secret as a mismatch without calling the RPC for it', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', '');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { actor, rpc } = setup({ approval: approval('4'), meal: meal('4') });
  expect(await verifyKoSecrets(actor, { secret: approval('4') })).toEqual(['KO_MEAL_RECEIPT_SECRET']);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(warn).toHaveBeenCalledWith('KO secrets do not match the database:', 'KO_MEAL_RECEIPT_SECRET');
});

it('checks once per process per secret value and re-checks when a secret changes', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('5'));
  const dbSecrets = { approval: approval('5'), meal: meal('5') };
  const { actor, rpc } = setup(dbSecrets);
  expect(await verifyKoSecrets(actor, { secret: approval('5') })).toEqual([]);
  expect(await verifyKoSecrets(actor, { secret: approval('5') })).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(2);
  // The secret rotated on both sides: the new value is checked once, then cached again.
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('6'));
  dbSecrets.meal = meal('6');
  expect(await verifyKoSecrets(actor, { secret: approval('5') })).toEqual([]);
  expect(await verifyKoSecrets(actor, { secret: approval('5') })).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(4);
});

it('lets a meal reply through when only the meal secret is missing', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', '');
  const { actor, rpc } = setup({ approval: approval('10'), meal: meal('10') });
  expect(await verifyKoApprovalSecret(actor, { secret: approval('10') })).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(1);
  expectMac(rpc, 'approval', approval('10'));
});

it('still fails closed when the approval secret disagrees, even with a good meal secret', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('11'));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { actor, rpc } = setup({ approval: approval('9'), meal: meal('11') });
  expect(await verifyKoApprovalSecret(actor, { secret: approval('11') })).toEqual(['KO_APPROVAL_SECRET']);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(warn).toHaveBeenCalledWith('KO secrets do not match the database:', 'KO_APPROVAL_SECRET');
});

it('checks the approval secret once per process per value', async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', meal('12'));
  const { actor, rpc } = setup({ approval: approval('12'), meal: meal('12') });
  expect(await verifyKoApprovalSecret(actor, { secret: approval('12') })).toEqual([]);
  expect(await verifyKoApprovalSecret(actor, { secret: approval('12') })).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(1);
});

it.each(['error', 'throws'] as const)('swallows RPC %s as a mismatch instead of throwing', async fail => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', fail === 'error' ? meal('7') : meal('8'));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const secret = fail === 'error' ? approval('7') : approval('8');
  const { actor } = setup({ approval: secret, meal: meal('7') }, fail);
  expect(await verifyKoSecrets(actor, { secret })).toEqual(['KO_APPROVAL_SECRET', 'KO_MEAL_RECEIPT_SECRET']);
  expect(warn).toHaveBeenCalledWith(
    'KO secrets do not match the database:', 'KO_APPROVAL_SECRET, KO_MEAL_RECEIPT_SECRET');
});
