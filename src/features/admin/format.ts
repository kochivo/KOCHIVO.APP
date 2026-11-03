import { formatTimestampAr } from '@/lib/dates';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import type { CaptainRow, CaptainState, Tier } from './types';

export const tierLabel = (tier: Tier) => tier.toUpperCase();
export const usageLabel = (active: number, limit: number) => `${active} من ${limit}`;
export function captainState(row: CaptainRow): CaptainState {
  if (row.suspended) return 'suspended';
  if (!row.email_confirmed) return 'unconfirmed';
  if (row.tier === 'entry' && row.last_paid_ends_at !== null) return 'expired';
  return row.tier === 'entry' ? 'free' : 'paid';
}
export function endsLabel(date: string | null): string {
  if (!date || !Number.isFinite(Date.parse(date))) return '—';
  return formatTimestampAr(date, { day: 'numeric', month: 'short', year: 'numeric' });
}
export function actionError(error: unknown): string {
  const { code, message } = readError(error);
  if (isPermissionDenied(error)) return 'مش مسموح';
  if (code === '22023' && message === 'unknown tier') return 'الباقة مش موجودة';
  if (code === '22023') return 'البيانات مش صحيحة، راجع الحساب والمدة';
  return 'العملية ما كملتش، جرّب تاني';
}
export const stateLabels: Record<CaptainState, string> = {
  suspended: 'موقوف', expired: 'خلصت باقته', paid: 'مدفوع', free: 'مجاني', unconfirmed: 'إيميل مش متأكد',
};
