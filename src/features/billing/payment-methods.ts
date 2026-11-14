import { z } from 'zod';
import { methodKeys } from './method-keys';

export const paymentMethod = z.enum(methodKeys);
export type PaymentMethod = z.infer<typeof paymentMethod>;
export const acceptedMethod = z.object({
  method: paymentMethod, account_detail: z.string().max(80).nullable(), position: z.number().int().min(0).max(3),
}).refine(row => row.method === 'cash' || Boolean(row.account_detail?.trim()));
export type AcceptedMethod = z.infer<typeof acceptedMethod>;
