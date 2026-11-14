import { DEFAULT_LOCALE } from './locale';
import type { Locale } from './locale';

const ARAB_COUNTRIES = new Set('EG SA AE KW QA BH OM YE IQ JO LB SY PS LY TN DZ MA SD MR SO DJ KM'.split(' '));

export function detectLocale({ acceptLanguage, country }: {
  acceptLanguage?: string | null; country?: string | null;
} = {}): Locale {
  const language = acceptLanguage?.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  if (language === 'ar' || language?.startsWith('ar-')) return 'ar';
  if (language === 'en' || language?.startsWith('en-')) return 'en';
  const region = country?.trim().toUpperCase();
  if (region) return ARAB_COUNTRIES.has(region) ? 'ar' : 'en';
  return DEFAULT_LOCALE;
}
