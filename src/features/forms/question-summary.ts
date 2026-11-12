import type { Locale, ArabicStyle } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from './redesign/messages';
import { formCopy } from './form-copy';
import type { Question } from './types';

export function questionSummary(q: Question, locale: Locale, style: ArabicStyle = 'egyptian'): string {
  const t = createT(messages, locale, style), m = formCopy(locale, style);
  const kind = q.type === 'scale' ? t('scaleSummary') : q.type === 'photos' ? t('photo') : q.type === 'multi' || q.type === 'yesno' ? m.types[q.type] : t(q.type);
  const parts = [kind];
  if (q.maps_to === 'weight' || q.maps_to === 'targetWeight') parts.push(t('kg'));
  if (q.maps_to === 'height' || q.maps_to === 'waist') parts.push(t('cm'));
  if (q.maps_to) parts.push(`${t('profile')} ${q.maps_to === 'waist' ? t('waist') : m.facts[q.maps_to]}`);
  if (q.alert_on) {
    const rule = q.alert_on, operator = rule.operator === 'lt' ? m.alertBelow : rule.operator === 'gt' ? m.alertAbove : m.alertEqual;
    const option = q.options.find(o => o.value === rule.value);
    const value = q.type === 'yesno' ? rule.value ? m.yes : m.no
      : option ? locale === 'ar' ? option.label_ar : option.label_en || option.label_ar : String(rule.value);
    parts.push(t('alertSummary', { operator, value }));
  }
  return parts.join(' · ');
}
