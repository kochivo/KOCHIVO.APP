import { z } from 'zod';
import type { AdminDashboard, AdminCaptainActivity, AdminCaptainDetail } from './dashboard-types';

const count = z.number().int().nonnegative();
const money = z.number().nonnegative();
const tier = z.enum(['entry', 'champion', 'legend', 'empire']);
const timestamp = z.iso.datetime({ offset: true });
const trend = z.object({ value: count, previous: count });
export const adminDashboardSchema: z.ZodType<AdminDashboard> = z.object({
  actions: z.object({ pendingCaptains: count, expiringSoon: count, overLimit: count, quietPaid: count }),
  mrr: z.object({ value: money, previous: money }),
  captains: trend, paidCaptains: trend, players: trend, activeCaptains: trend,
  signups: z.array(z.object({ day: z.iso.date(), captains: count, players: count })).length(30),
  planMix: z.array(z.object({ tier, captains: count })),
  stateCounts: z.object({ all: count, paid: count, free: count, expiringSoon: count,
    expired: count, unconfirmed: count, suspended: count }),
  health: z.object({ cronJobs: count, cronFailures24h: count, pendingDeletions: count }),
});
export const adminCaptainActivitySchema: z.ZodType<AdminCaptainActivity[]> = z.array(z.object({
  id: z.uuid(), lastActiveAt: timestamp.nullable(), expiringSoon: z.boolean(), quiet: z.boolean(),
})).max(100);
export const adminCaptainDetailSchema: z.ZodType<AdminCaptainDetail> = z.object({
  id: z.uuid(), phone: z.string().nullable(), players: count, trainedThisWeek: count, totalPaidEgp: money,
  history: z.array(z.object({ tier, months: z.number().int().positive(), amountEgp: money,
    startsAt: timestamp, endsAt: timestamp, paymentRef: z.string().nullable() })).max(24),
});

export const activationSchema = z.object({
  captain_id: z.uuid(),
  tier: z.enum(['entry', 'champion', 'legend', 'empire']),
  months: z.number().int().min(1).max(12),
  payment_ref: z.string().trim().max(80).optional(),
});
export const suspensionSchema = z.object({
  user_id: z.uuid(), suspended: z.boolean(), reason: z.string().trim().min(3).max(200),
});
