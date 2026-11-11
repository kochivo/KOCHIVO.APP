import { actionTimezone } from '@/core/timezone/action-timezone';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { intlLocale } from '@/core/i18n/locale';
import { factLabel, factValue } from '../components/player-file-format';
import type { PlayerForm } from './adapter';
import { messages } from './messages';

export function formDate(at: string, locale: Locale, timezone = actionTimezone()) {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: timezone }).format(new Date(at));
}
export function formSummary(form: PlayerForm, locale: Locale) {
  const t = createT(messages, locale);
  const relevant = form.comparison.find(row => row.key === 'injuries' && row.direction === 'worse')
    ?? form.comparison.find(row => row.direction === 'better' || row.direction === 'worse')
    ?? (form.previous ? form.comparison.find(row => {
      if (Array.isArray(row.value) && Array.isArray(row.previousValue)) {
        const old = new Set<string | number>(row.previousValue);
        return row.value.length !== row.previousValue.length || row.value.some(value => !old.has(value));
      }
      return row.value !== row.previousValue;
    }) : undefined);
  if (!relevant) {
    if (form.previous && form.bodyFat !== null && form.bodyFat !== form.previousBodyFat) {
      const change = form.previousBodyFat == null ? t('percent', { value: String(form.bodyFat) })
        : new Intl.NumberFormat(intlLocale(locale), { signDisplay: 'always', maximumFractionDigits: 2 }).format(form.bodyFat - form.previousBodyFat);
      return t('summary', { field: t('bodyFat'), change });
    }
    return t(form.previous ? 'same' : 'first');
  }
  const change = relevant.delta === undefined ? factValue(relevant.key, relevant.value, locale)
    : new Intl.NumberFormat(intlLocale(locale), { signDisplay: 'always', maximumFractionDigits: 2 }).format(relevant.delta);
  return t('summary', { field: factLabel(relevant.key, locale), change });
}
