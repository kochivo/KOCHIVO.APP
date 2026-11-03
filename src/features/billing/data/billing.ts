'use server';

import { fetchBillingAt } from './billing-internal';

import { z } from 'zod';
import { captainClient } from './client';
import type { BillingResult, RenewalInput } from '../types';

const renewal = z.object({
  playerId: z.uuid(), days: z.number().int().min(1).max(365),
  amount: z.number().int().min(0).max(100000).nullable().default(null),
});
const invalid = 'راجع المدة والمبلغ وجرّب تاني';
const failed = 'التجديد متسجلش. جرّب تاني';

export async function renewPlayer(input: RenewalInput): Promise<{ data: string; error?: never } | { error: string; data?: never }> {
  const parsed = renewal.safeParse(input);
  if (!parsed.success) return { error: invalid };
  try {
    const { client } = await captainClient();
    const { playerId, days, amount } = parsed.data;
    const result = await client.rpc('renew_player', { p_player: playerId, p_days: days, p_amount: amount });
    if (result.error) return { error: result.error.code === '42501' ? 'مش مسموح تجدّد للاعب ده. راجع حسابك'
      : result.error.code === '22023' ? invalid : failed };
    return result.data ? { data: result.data } : { error: failed };
  } catch { return { error: failed }; }
}

export async function fetchBilling(): Promise<BillingResult> {
  return fetchBillingAt(new Date());
}
