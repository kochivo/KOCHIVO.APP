export type Locale = 'ar' | 'en';
export type ArabicStyle = 'egyptian' | 'standard';
export function resolveArabicStyle(options: {
  profileTimezone?: string | null;
  deviceTimezone?: string; language?: string;
} = {}): ArabicStyle {
  return options.profileTimezone === 'Africa/Cairo' || options.deviceTimezone === 'Africa/Cairo' ||
    options.language?.toLowerCase() === 'ar-eg' ? 'egyptian' : 'standard';
}
export const LOCALES = ['ar', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'kochivo.locale';
export const LOCALE_COOKIE_OPTIONS = {
  maxAge: 365 * 24 * 60 * 60, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production',
} as const;

export function parseLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}
export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
export function intlLocale(locale: Locale): 'ar-EG' | 'en-GB' {
  return locale === 'ar' ? 'ar-EG' : 'en-GB';
}
