'use server';
import { getLocale } from '@/core/i18n/server';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';
import { suspensionSchema } from '../schemas';
import { actionError } from '../format';
import type { ActionResult } from '../types';

export async function setSuspended(input: unknown): Promise<ActionResult> {
  const locale = await getLocale();
  const t = await getT(messages, locale);
  const client = await requireAdmin();
  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success) return { error: t('reasonLimit') };
  const value = parsed.data;
  try {
    const { error } = await client.rpc('admin_set_suspended', {
      p_user: value.user_id, p_suspended: value.suspended, p_reason: value.reason,
    });
    if (error) return { error: actionError(error, locale) };
  } catch { return { error: t('failed') }; }
  revalidatePath('/admin');
  return { success: true };
}
