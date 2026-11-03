import { localDate } from '@/lib/dates';
import type { CaptainRow, CaptainState, Tier } from './types';

export const tierLabel = (tier: Tier) => tier.toUpperCase();
export const usageLabel = (active: number, limit: number) => `${active} من ${limit}`;
export function captainState(row: CaptainRow, today: string): CaptainState {
  if (row.suspended) return 'suspended';
  if (!row.email_confirmed) return 'unconfirmed';
  if (row.tier_ends_at && localDate(new Date(row.tier_ends_at)) < today) return 'expired';
  return row.tier === 'entry' ? 'free' : 'paid';
}
export function endsLabel(date: string | null): string {
  if (!date || !Number.isFinite(Date.parse(date))) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date));
}
export function actionError(error: { code?: string; message?: string }): string {
  if (error.code === '42501') return 'مش مسموح';
  if (error.code === '22023' && error.message === 'unknown tier') return 'الباقة مش موجودة';
  if (error.code === '22023') return 'البيانات مش صحيحة، راجع الحساب والمدة';
  return 'العملية ما كملتش، جرّب تاني';
}
export const stateLabels: Record<CaptainState, string> = {
  suspended: 'موقوف', expired: 'خلصت باقته', paid: 'مدفوع', free: 'مجاني', unconfirmed: 'إيميل مش متأكد',
};
