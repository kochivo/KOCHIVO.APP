import { z } from 'zod';
import { normalizeWhatsapp, shiftInviteDate } from './invite-plan';

export function playerInviteSchema(today: string) {
  return z.object({
    name: z.string().trim().min(1).max(60),
    whatsapp: z.string().transform(normalizeWhatsapp).refine(v => v !== undefined),
    packageId: z.uuid().nullable(), kind: z.enum(['days', 'sessions']), quantity: z.number().int().min(1).max(365),
    price: z.number().int().min(0).max(100000), paid: z.number().int().min(0).max(100000), freeTrial: z.boolean(),
    startsOn: z.iso.date().refine(v => v >= shiftInviteDate(today, -30) && v <= shiftInviteDate(today, 60)),
    formIds: z.array(z.uuid()).max(5).refine(ids => new Set(ids).size === ids.length).optional(),
    gate: z.boolean().optional(),
  }).refine(v => v.paid <= v.price, { path: ['paid'] })
    .refine(v => v.kind !== 'sessions' || v.quantity <= 200, { path: ['quantity'] });
}
