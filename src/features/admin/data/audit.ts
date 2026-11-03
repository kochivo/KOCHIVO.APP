import 'server-only';
import { requireAdmin } from './require-admin';

export async function fetchAudit() {
  const client = await requireAdmin();
  try {
    const { data, error } = await client.from('admin_audit_log').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    return { rows: data ?? [], error: error ? 'مش قادرين نحمّل آخر العمليات' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل آخر العمليات' };
  }
}
