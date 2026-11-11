import { LOCALE_COOKIE_OPTIONS } from './locale';

export function devicePreferenceCookies(timezone: string, language: string): string[] {
  const suffix = `; Path=/; Max-Age=${LOCALE_COOKIE_OPTIONS.maxAge}; SameSite=Lax${LOCALE_COOKIE_OPTIONS.secure ? '; Secure' : ''}`;
  return [`kochivo.timezone=${encodeURIComponent(timezone)}${suffix}`, `kochivo.language=${encodeURIComponent(language)}${suffix}`];
}

export function devicePreference(value?: string): string | undefined {
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return undefined; }
}
