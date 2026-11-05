import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { isPermissionDenied, readError } from '@/core/supabase/errors';
import { messages } from './messages';
import type { CaptainRow, CaptainState, Tier } from './types';

export const tierLabel = (tier: Tier) => tier.toUpperCase();
export const usageLabel = (active: number, limit: number, locale: Locale = 'ar') =>
  createT(messages, locale)('usage', { active: formatNumber(active, locale), limit: formatNumber(limit, locale) });
export function captainState(row: CaptainRow): CaptainState {
  if (row.suspended) return 'suspended';
  if (!row.email_confirmed) return 'unconfirmed';
  if (row.tier === 'entry' && row.last_paid_ends_at !== null) return 'expired';
  return row.tier === 'entry' ? 'free' : 'paid';
}
export function endsLabel(date: string | null, locale: Locale = 'ar'): string {
  if (!date || !Number.isFinite(Date.parse(date))) return createT(messages, locale)('dash');
  return formatTimestampAr(date, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
}
export function actionError(error: unknown, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const { code, message } = readError(error);
  if (isPermissionDenied(error)) return t('denied');
  if (code === '22023' && message === 'unknown tier') return t('noTier');
  if (code === '22023') return t('invalid');
  return t('failed');
}
export const stateLabels: Record<CaptainState, CaptainState> = {
  suspended: 'suspended', expired: 'expired', paid: 'paid', free: 'free', unconfirmed: 'unconfirmed',
};
