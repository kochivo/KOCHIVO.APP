'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { methodKeys, paymentMethodClient } from '@/features/billing';
import { acceptedMethod } from '@/features/billing/server';

export async function savePaymentMethod(input: unknown) {
  try {
    const parsed = z.discriminatedUnion('enabled', [
      z.object({ enabled: z.literal(true), row: acceptedMethod }).strict(),
      z.object({ enabled: z.literal(false), row: z.object({ method: z.enum(methodKeys), account_detail: z.string().nullable(), position: z.number() }) }).strict(),
    ]).parse(input);
    const client = paymentMethodClient(await supabaseServer());
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Authentication required');
    const captainId = auth.data.user.id;
    const result = parsed.enabled
      ? await client.from('captain_payment_methods').upsert({ captain_id: captainId, ...parsed.row })
      : await client.from('captain_payment_methods').delete().eq('captain_id', captainId).eq('method', parsed.row.method);
    if (result.error) throw result.error;
    return { ok: true };
  } catch (error) { unstable_rethrow(error); return { ok: false }; }
}
