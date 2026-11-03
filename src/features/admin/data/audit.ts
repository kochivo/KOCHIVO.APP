import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import 'server-only';
import { z } from 'zod';
import { requireAdmin } from './require-admin';

const actionSchema = z.enum(['activate_plan', 'suspend', 'unsuspend']);
const detailsSchema = z.record(z.string(), z.unknown());

export async function fetchAudit() {
  const t = await getT(messages);
  const client = await requireAdmin();
  try {
    const { data, error } = await client.from('admin_audit_log').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    return { rows: (data ?? []).map(row => ({ ...row, action: actionSchema.parse(row.action),
      details: detailsSchema.parse(row.details) })), error: error ? t('auditFailed') : null };
  } catch {
    return { rows: [], error: t('auditFailed') };
  }
}
