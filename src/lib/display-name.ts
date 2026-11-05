import type { Locale } from '@/core/i18n/locale';

type NamedRow = { name_ar?: string | null; name_en?: string | null };

export function exerciseName(row: NamedRow, locale: Locale): string {
  return locale === 'en' ? row.name_en || row.name_ar || '' : row.name_ar || row.name_en || '';
}

export function foodName(row: NamedRow, locale: Locale): string {
  return locale === 'en' ? row.name_en || row.name_ar || '' : row.name_ar || row.name_en || '';
}
