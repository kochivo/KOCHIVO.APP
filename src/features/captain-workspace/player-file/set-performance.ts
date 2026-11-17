import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

export function setPerformance(weight: number | null, reps: number | null, unit: string, locale: Locale) {
  return `${formatNumber(weight ?? 0, locale)} ${unit} × ${formatNumber(reps ?? 0, locale)}`;
}
