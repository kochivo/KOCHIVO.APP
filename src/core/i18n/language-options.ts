import type { Locale } from './locale';

export type LanguageChoice = { locale: Locale; label: 'arabic' | 'english' };
export function languageOptions(): LanguageChoice[] {
  return [{ locale: 'ar', label: 'arabic' }, { locale: 'en', label: 'english' }];
}
