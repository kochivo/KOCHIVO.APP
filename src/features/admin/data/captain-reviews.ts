'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { requireAdmin } from './require-admin';
import { messages } from '../approvals/messages';

export async function fetchPendingCaptains() {
  const t = await getT(messages);
  const client = await requireAdmin();
  try {
    const { data, error } = await client.rpc('admin_pending_captains');
    return { rows: data ?? [], error: error ? t('loadFailed') : null };
  } catch (error) {
    unstable_rethrow(error);
    return { rows: [], error: t('loadFailed') };
  }
}

const schema = z.object({ captain: z.uuid(), status: z.enum(['approved', 'rejected']) });
export async function reviewCaptain(input: unknown) {
  const t = await getT(messages);
  const client = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: t('failed') };
  try {
    const { error } = await client.rpc('admin_review_captain', {
      p_captain: parsed.data.captain, p_status: parsed.data.status,
    });
    if (error) return { error: t('failed') };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('failed') };
  }
  revalidatePath('/admin');
  return { success: true };
}
