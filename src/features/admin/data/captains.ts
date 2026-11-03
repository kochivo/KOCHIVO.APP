import 'server-only';
import { requireAdmin } from './require-admin';
import type { CaptainRow } from '../types';

export async function fetchCaptains({ search = '', limit = 100, offset = 0 } = {}): Promise<{ rows: CaptainRow[]; error: string | null }> {
  const client = await requireAdmin();
  try {
    const { data, error } = await client.rpc('admin_captains', {
      p_search: search.trim() || null, p_limit: limit, p_offset: offset,
    });
    return { rows: data ?? [], error: error ? 'مش قادرين نحمّل الكباتن، جرّب تاني' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل الكباتن، جرّب تاني' };
  }
}

export async function fetchPlanTiers() {
  const client = await requireAdmin();
  try {
    const { data, error } = await client.from('plan_tiers').select('*').order('position');
    return { rows: data ?? [], error: error ? 'مش قادرين نحمّل أسعار الباقات' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل أسعار الباقات' };
  }
}
