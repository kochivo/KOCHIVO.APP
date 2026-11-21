import { z } from 'zod';

const id = z.uuid();
export const tierInput = z.object({
  id: id.optional(), newId: id.optional(), name: z.string().trim().min(1).max(40), description: z.string().max(80).default(''),
  color: z.enum(['muted', 'lime', 'warn', 'danger']).default('muted'), position: z.number().int().min(0).default(0),
  features: z.array(z.string().max(80)).max(10).default([]), is_featured: z.boolean().default(false),
}).strict();
export const offerInput = z.object({
  id: id.optional(), name: z.string().trim().min(1).max(40), kind: z.enum(['percent', 'amount', 'bonus_days']),
  value: z.number().positive(), scope: z.enum(['all', 'tiers', 'packages']).default('all'),
  tier_ids: z.array(id).default([]), package_ids: z.array(id).default([]),
  starts_at: z.iso.datetime({ offset: true }), ends_at: z.iso.datetime({ offset: true }),
  for_new: z.boolean().default(true), for_renewals: z.boolean().default(true),
  max_uses: z.number().int().positive().nullable().default(null),
}).strict().refine(v => Date.parse(v.ends_at) > Date.parse(v.starts_at) && (v.for_new || v.for_renewals)
  && (v.kind === 'amount' || (v.kind === 'percent' ? v.value >= 1 && v.value <= 90 : Number.isInteger(v.value) && v.value <= 365))
  && (v.scope === 'all' ? v.tier_ids.length === 0 && v.package_ids.length === 0
    : v.scope === 'tiers' ? v.tier_ids.length > 0 && v.package_ids.length === 0 : v.package_ids.length > 0 && v.tier_ids.length === 0));
