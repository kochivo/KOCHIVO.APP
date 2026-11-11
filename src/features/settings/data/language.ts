'use server';

import { supabaseServer } from '@/core/supabase/server';
import { setLocale } from '@/core/i18n/set-locale';
import { parseArabicStyle } from '@/core/i18n/locale';
import type { LanguageChoice } from '@/core/i18n/language-options';
import { internationalEnabled } from '@/lib/international-enabled';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArabicStyleDatabase } from '@/core/i18n/profile';

export async function saveLanguage(choice: LanguageChoice): Promise<void> {
  if (choice.locale !== 'ar' && choice.locale !== 'en') throw new Error('Invalid locale');
  if (!internationalEnabled()) return setLocale(choice.locale);
  if (choice.style !== undefined && !parseArabicStyle(choice.style)) throw new Error('Invalid Arabic style');
  if (choice.locale === 'ar' && choice.style) {
    const client = await supabaseServer();
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Unauthenticated');
    const languageClient = client as unknown as SupabaseClient<ArabicStyleDatabase>;
    const result = await languageClient.from('profiles').update({ arabic_style: choice.style }).eq('id', auth.data.user.id);
    if (result.error) throw new Error('Language save failed');
    return setLocale(choice.locale, choice.style);
  }
  await setLocale(choice.locale);
}
