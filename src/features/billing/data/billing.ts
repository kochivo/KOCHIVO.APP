'use server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { fetchBillingAt } from './billing-internal';

import { z } from 'zod';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import { captainClient } from './client';
import type { BillingResult, RenewalInput } from '../types';

const money = z.number().int().min(0).max(100000);
const renewal = z.object({
  playerId: z.uuid(), days: z.number().int().min(1).max(365).nullable().default(null),
  amount: money.nullable().default(null), price: money.nullable().default(null),
  packageId: z.uuid().nullable().default(null),
}).refine((value) => value.days !== null || value.packageId !== null)
  .refine((value) => value.price === null || (value.amount ?? 0) <= value.price);

export async function renewPlayer(input: RenewalInput): Promise<{ data: string; error?: never } | { error: string; data?: never }> {
  const t = await getT(messages);
  const invalid = t('invalid');
  const failed = t('renewFailed');
  const parsed = renewal.safeParse(input);
  if (!parsed.success) return { error: invalid };
  try {
    const { client } = await captainClient();
    const { playerId, days, amount, price, packageId } = parsed.data;
    const result = await client.rpc('renew_player', {
      p_player: playerId, ...(days === null ? {} : { p_days: days }), ...(amount === null ? {} : { p_amount: amount }),
      ...(price === null ? {} : { p_price: price }), ...(packageId === null ? {} : { p_package: packageId }),
    });
    if (result.error) return { error: isPermissionDenied(result.error) ? t('denied')
      : readError(result.error).code === '22023' ? invalid : failed };
    return result.data ? { data: result.data } : { error: failed };
  } catch { return { error: failed }; }
}

export async function fetchBilling(): Promise<BillingResult> {
  return fetchBillingAt(new Date());
}
