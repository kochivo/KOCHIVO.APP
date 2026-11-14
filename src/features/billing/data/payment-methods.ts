'use server';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { paymentMethodClient } from './payment-method-client';

export async function loadPaymentMethods() {
  try {
    const client = paymentMethodClient(await supabaseServer());
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Authentication required');
    const result = await client.from('captain_payment_methods').select('method,account_detail,position').order('position').order('method');
    if (result.error) throw result.error;
    return { data: result.data, error: false };
  } catch (error) { unstable_rethrow(error); return { data: null, error: true }; }
}
