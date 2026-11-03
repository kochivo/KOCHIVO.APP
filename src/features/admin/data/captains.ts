import 'server-only';
import { requireAdmin } from './require-admin';
import { activationSchema } from '../schemas';
import type { CaptainRow } from '../types';

export async function fetchCaptains({ search = '', limit = 100, offset = 0 } = {}): Promise<{ rows: CaptainRow[]; error: string | null }> {
  const client = await requireAdmin();
  try {
    const term = search.trim();
    const { data, error } = await client.rpc('admin_captains', {
      ...(term ? { p_search: term } : {}), p_limit: limit, p_offset: offset,
    });
    return { rows: (data ?? []).map(row => ({ ...row, tier: activationSchema.shape.tier.parse(row.tier),
      last_paid_tier: activationSchema.shape.tier.nullable().parse(row.last_paid_tier) })),
    error: error ? 'مش قادرين نحمّل الكباتن، جرّب تاني' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل الكباتن، جرّب تاني' };
  }
}

export async function fetchPlanTiers() {
  const client = await requireAdmin();
  try {
    const { data, error } = await client.from('plan_tiers').select('*').order('position');
    return { rows: (data ?? []).map(row => ({ ...row, tier: activationSchema.shape.tier.parse(row.tier) })),
      error: error ? 'مش قادرين نحمّل أسعار الباقات' : null };
  } catch {
    return { rows: [], error: 'مش قادرين نحمّل أسعار الباقات' };
  }
}
