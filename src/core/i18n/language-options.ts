import { internationalEnabled } from '@/lib/international-enabled';
import type { ArabicStyle, Locale } from './locale';

export type LanguageChoice = { locale: Locale; style?: ArabicStyle; label: 'arabic' | 'english' | 'arabicEgyptian' | 'arabicStandard' };
export function languageOptions(): LanguageChoice[] {
  return internationalEnabled() ? [
    { locale: 'ar', style: 'egyptian', label: 'arabicEgyptian' },
    { locale: 'ar', style: 'standard', label: 'arabicStandard' },
    { locale: 'en', label: 'english' },
  ] : [{ locale: 'ar', label: 'arabic' }, { locale: 'en', label: 'english' }];
}
