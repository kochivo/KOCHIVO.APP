import { expect, it } from 'vitest';
import { defaultInvitePlan, inviteAmounts, inviteEndDate, isInviteDate, normalizeWhatsapp } from './invite-plan';

const pkg = { id: 'package', name: 'PT', kind: 'sessions' as const, sessions: 8, days: 45, price_egp: 500 };
it('defaults to a package with full payment and the supplied Cairo date', () => {
  expect(defaultInvitePlan(pkg, '2026-11-03')).toEqual({ packageId: 'package', kind: 'sessions', quantity: 8,
    price: 500, paid: 500, freeTrial: false, startsOn: '2026-11-03' });
  expect(defaultInvitePlan(undefined, '2026-11-03')).toMatchObject({ packageId: null, kind: 'days', quantity: 30, price: 0, paid: 0 });
});
it('derives discount and remaining amounts and zeroes a trial', () => {
  expect(inviteAmounts({ price: 400, paid: 150, freeTrial: false }, pkg)).toEqual({ price: 400, paid: 150, discount: 100, remaining: 250 });
  expect(inviteAmounts({ price: 400, paid: 150, freeTrial: true }, pkg)).toEqual({ price: 0, paid: 0, discount: 0, remaining: 0 });
});
it('calculates inclusive days and PT validity across calendar boundaries', () => {
  expect(inviteEndDate({ kind: 'days', quantity: 30, startsOn: '2026-11-03' })).toBe('2026-12-02');
  expect(inviteEndDate({ kind: 'days', quantity: 1, startsOn: '2026-11-03' })).toBe('2026-11-03');
  expect(inviteEndDate({ kind: 'sessions', quantity: 8, startsOn: '2026-11-03' }, pkg)).toBe('2026-12-18');
  expect(inviteEndDate({ kind: 'sessions', quantity: 8, startsOn: '2026-11-03' })).toBe('2027-01-02');
});
it.each([['01001234567', '201001234567'], ['201001234567', '201001234567'], ['', null],
  ['12345678', '12345678'], ['1234567', undefined], ['abc12345678', undefined], ['+201001234567', undefined],
  ['1234567890123456', undefined]])('normalizes WhatsApp %s', (input, expected) => {
  expect(normalizeWhatsapp(input)).toBe(expected);
});
it.each(['', '10000-01-01', '2026-02-30', '2026-1-03'])('rejects incomplete or unrepresentable preview date %s', date => {
  expect(isInviteDate(date)).toBe(false);
});
it('limits previews to the accepted start window before calculating an end date', () => {
  expect(isInviteDate('9999-12-31', '2026-11-03')).toBe(false);
  expect(isInviteDate('2026-10-03', '2026-11-03')).toBe(false);
  expect(isInviteDate('2026-10-04', '2026-11-03')).toBe(true);
  expect(isInviteDate('2027-01-02', '2026-11-03')).toBe(true);
  expect(isInviteDate('2027-01-03', '2026-11-03')).toBe(false);
});
