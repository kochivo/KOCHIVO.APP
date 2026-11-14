'use server';

import { setLocale } from '@/core/i18n/set-locale';
import type { LanguageChoice } from '@/core/i18n/language-options';

export async function saveLanguage(choice: LanguageChoice): Promise<void> {
  if (choice.locale !== 'ar' && choice.locale !== 'en') throw new Error('Invalid locale');
  await setLocale(choice.locale);
}
