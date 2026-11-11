import { actionTimezone } from '@/core/timezone/action-timezone';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { FactKey, FactValues, FormSource } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
const labels = { weight: 'currentWeight', targetWeight: 'targetWeight', height: 'height', age: 'age',
  trainingDays: 'trainingDays', sessionMinutes: 'sessionMinutes', injuries: 'injuries', medical: 'medical',
  allergies: 'allergies', note: 'note', sex: 'sex', experience: 'experience', waist: 'waist' } as const;
const options = ['none', 'knee', 'lower_back', 'shoulder', 'neck', 'wrist', 'ankle', 'hip', 'other',
  'lactose', 'milk', 'gluten', 'nuts', 'eggs', 'seafood', 'heart', 'blood_pressure', 'diabetes', 'asthma',
  'recent_surgery', 'pregnancy', 'male', 'female', 'new', 'under_1y'] as const;

export function factLabel(key: FactKey, locale: Locale) {
  return createT(messages, locale)(labels[key]);
}
export function optionLabel(value: string, locale: Locale): string {
  const t = createT(messages, locale);
  const key = options.find(key => key === value);
  if (key) return t(key);
  if (value === '1_3y') return t('experienceRange', { min: formatNumber(1, locale), max: formatNumber(3, locale) });
  if (value === 'over_3y') return t('experienceOver', { count: formatNumber(3, locale) });
  return value;
}
export function factValue(key: FactKey, value: FactValues[FactKey] | undefined, locale: Locale): string {
  const t = createT(messages, locale);
  if (value === undefined || value === null) return t('unavailable');
  if (Array.isArray(value)) return value.length ? value.map(item => typeof item === 'number'
    ? (weekdays[item] ? t(weekdays[item]) : t('unavailable')) : optionLabel(item, locale)).join(' · ') : t('none');
  if (typeof value === 'number') {
    const count = formatNumber(value, locale);
    if (key === 'age') return t('years', { count });
    if (key === 'height' || key === 'waist') return t('cm', { count });
    if (key === 'sessionMinutes') return t('minutes', { count });
    return t('kg', { count });
  }
  return optionLabel(value, locale);
}
export function sourceLabel(source: FormSource, locale: Locale, timezone = actionTimezone()): string {
  const t = createT(messages, locale);
  const date = new Date(source.at);
  const month = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', timeZone: timezone }).format(date);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: timezone }).format(date);
  return t('sourceDate', { source: source.title ?? t(source.kind === 'intake' ? 'intake' : source.kind === 'checkin' ? 'checkin' : 'form'),
    date: `${formatNumber(Number(day), locale)} ${month}` });
}
