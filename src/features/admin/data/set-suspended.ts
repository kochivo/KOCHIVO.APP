'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from './require-admin';
import { suspensionSchema } from '../schemas';
import { actionError } from '../format';
import type { ActionResult } from '../types';

export async function setSuspended(input: unknown): Promise<ActionResult> {
  const client = await requireAdmin();
  const parsed = suspensionSchema.safeParse(input);
  if (!parsed.success) return { error: 'اكتب سبب من 3 لـ 200 حرف' };
  const value = parsed.data;
  try {
    const { error } = await client.rpc('admin_set_suspended', {
      p_user: value.user_id, p_suspended: value.suspended, p_reason: value.reason,
    });
    if (error) return { error: actionError(error) };
  } catch { return { error: 'العملية ما كملتش، جرّب تاني' }; }
  revalidatePath('/admin');
  return { success: true };
}
