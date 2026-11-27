'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { requireAdmin } from '../data/require-admin';
import { importPayload } from './import-payload';
import { importRows } from './import-rows';
import { messages } from './messages';

export async function findImportCaptain(email: string) {
  const client = await requireAdmin();
  const t = await getT(messages);
  const parsed = z.string().trim().max(254).pipe(z.email()).safeParse(email);
  if (!parsed.success) return { error: t('invalid') };
  try {
    const { data, error } = await client.rpc('admin_find_import_captain', { p_email: parsed.data });
    if (error) return { error: t('generic') };
    if (data.length !== 1 || !data[0]) return { error: t('missing') };
    return { data: data[0] };
  } catch {
    return { error: t('generic') };
  }
}

export async function savePlanImport(input: unknown) {
  const client = await requireAdmin();
  const t = await getT(messages);
  const parsed = importPayload.safeParse(input);
  if (!parsed.success) return { error: t('invalid') };
  const plan = parsed.data;
  try {
    const fingerprint = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
    const { data, error } = await client.rpc('admin_import_plan', {
      p_id: plan.id, p_captain: plan.captainId, p_kind: plan.kind, p_title: plan.title,
      p_plan: importRows(plan, plan.kind === 'training' ? t('weekCount', { n: plan.weeks }) : '', fingerprint),
    });
    if (error || !data) return { error: t('generic') };
    revalidatePath('/[locale]/admin', 'page');
    return { data };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('generic') };
  }
}
