import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

export type JoinPackage = { days: number | null; sessions: number | null };
type LabelKey = 'packageMonths' | 'packageDays' | 'packageSessions';

export function joinPackageLabel(selection: JoinPackage | undefined, locale: Locale,
  t: (key: LabelKey, values?: Record<string, string | number>) => string): string {
  if (!selection) return '';
  const { days, sessions } = selection;
  if (days !== null && sessions === null && Number.isInteger(days) && days > 0) {
    if (days % 30 === 0) return t('packageMonths', { n: days / 30, count: formatNumber(days / 30, locale) });
    return t('packageDays', { n: days, count: formatNumber(days, locale) });
  }
  return days === null && sessions !== null && Number.isInteger(sessions) && sessions > 0
    ? t('packageSessions', { n: sessions, count: formatNumber(sessions, locale) }) : '';
}
