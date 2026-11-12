import { createT } from '@/core/i18n/messages';
import type { Locale, ArabicStyle } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { workspaceMessages } from './workspace-messages';
export function followupAge(createdAt: string, now: Date, locale: Locale, style?: ArabicStyle) {
  const t = createT(workspaceMessages, locale, style);
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(createdAt)) / 3_600_000));
  if (hours < 1) return t('ageNow');
  if (hours === 1) return t('ageHour');
  if (hours < 24) return t('ageHours', { n: formatNumber(hours, locale) });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('ageDay') : days === 2 ? t('ageTwoDays') : t('ageDays', { n: formatNumber(days, locale) });
}
