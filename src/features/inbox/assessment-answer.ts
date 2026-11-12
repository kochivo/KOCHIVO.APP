import type { Json } from '@/types/database';
import type { Option } from '@/features/forms';
import type { Locale } from '@/core/i18n/locale';
export function assessmentAnswer(value: Json, options: Option[], locale: Locale, yes: string, no: string): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? yes : no;
  if (Array.isArray(value)) return value.map(item => assessmentAnswer(item, options, locale, yes, no)).join(' · ');
  if (typeof value === 'object') return Object.values(value).map(item => assessmentAnswer(item ?? null, options, locale, yes, no)).join(' · ');
  const option = options.find(option => option.value === value);
  return option ? locale === 'en' ? option.label_en || option.label_ar : option.label_ar : String(value);
}
