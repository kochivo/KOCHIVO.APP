import type { Locale } from '@/core/i18n/locale';

type NamedRow = { name_ar?: string | null; name_en?: string | null };

export function exerciseName(row: NamedRow, locale: Locale): string {
  return locale === 'en' ? row.name_en || row.name_ar || '' : row.name_ar || row.name_en || '';
}

export function foodName(row: NamedRow, locale: Locale): string {
  return locale === 'en' ? row.name_en || row.name_ar || '' : row.name_ar || row.name_en || '';
}

const honorifics = new Set(['كابتن', 'كوتش', 'كوتشر', 'دكتور', 'دكتورة', 'د.', 'د', 'استاذ', 'أستاذ', 'coach', 'captain', 'dr', 'dr.']);

/** First name for greetings. Skips a leading title so "كابتن هشام" becomes "هشام", not "كابتن". */
export function givenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts.findIndex(part => !honorifics.has(part.toLowerCase()));
  return parts[first === -1 ? 0 : first] ?? '';
}
