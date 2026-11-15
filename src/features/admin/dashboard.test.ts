import { expect, it } from 'vitest';
import { adminCaptainActivitySchema, adminCaptainDetailSchema, adminDashboardSchema } from './schemas';

it('rejects incomplete dashboards and malformed captain activity', () => {
  expect(adminDashboardSchema.safeParse({}).success).toBe(false);
  expect(adminCaptainActivitySchema.safeParse([{ id: 'invalid', lastActiveAt: null, expiringSoon: false, quiet: true }]).success).toBe(false);
});

it('parses nullable activity and detail history without coercing invalid counts', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  expect(adminCaptainActivitySchema.parse([{ id, lastActiveAt: null, expiringSoon: false, quiet: true }])).toHaveLength(1);
  const detail = { id, phone: null, players: 0, trainedThisWeek: 0, totalPaidEgp: 699,
    history: [{ tier: 'legend', months: 1, amountEgp: 699, startsAt: '2026-10-01T00:00:00+00:00',
      endsAt: '2026-11-01T00:00:00+00:00', paymentRef: null }] };
  expect(adminCaptainDetailSchema.parse(detail)).toEqual(detail);
  expect(adminCaptainDetailSchema.safeParse({ ...detail, players: -1 }).success).toBe(false);
  expect(adminCaptainDetailSchema.safeParse({ ...detail, players: '0' }).success).toBe(false);
});
