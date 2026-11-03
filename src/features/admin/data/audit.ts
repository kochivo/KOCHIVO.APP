import 'server-only';
import { z } from 'zod';
import { requireAdmin } from './require-admin';

const actionSchema = z.enum(['activate_plan', 'suspend', 'unsuspend']);
const detailsSchema = z.record(z.string(), z.unknown());

export async function fetchAudit() {
  const client = await requireAdmin();
  try {
    const { data, error } = await client.from('admin_audit_log').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    return { rows: (data ?? []).map(row => ({ ...row, action: actionSchema.parse(row.action),
      details: detailsSchema.parse(row.details) })), error: error ? 'مش قادرين نحمّل آخر العمليات' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل آخر العمليات' };
  }
}
