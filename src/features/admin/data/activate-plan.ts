'use server';
import { getLocale } from '@/core/i18n/server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';
import { activationSchema } from '../schemas';
import { actionError } from '../format';
import type { ActionResult } from '../types';

export async function activatePlan(input: unknown): Promise<ActionResult> {
  const locale = await getLocale();
  const t = await getT(messages, locale);
  const client = await requireAdmin();
  const parsed = activationSchema.safeParse(input);
  if (!parsed.success) return { error: t('checkActivation') };
  const value = parsed.data;
  try {
    const { error } = await client.rpc('admin_activate_plan', {
      p_captain: value.captain_id, p_tier: value.tier, p_months: value.months,
      p_payment_ref: value.payment_ref || null,
    });
    if (error) return { error: actionError(error, locale) };
  } catch { return { error: t('failed') }; }
  revalidatePath('/admin');
  return { success: true };
}
