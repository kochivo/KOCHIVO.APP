'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LOCALE } from './locale';
import type { ArabicStyle, Locale } from './locale';
import { internationalEnabled } from '@/lib/international-enabled';
import { createT } from './messages';
import type { Messages } from './messages';
import { devicePreferenceCookies } from './device-preferences';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);
const ArabicStyleContext = createContext<ArabicStyle>('egyptian');
export function LocaleProvider({ locale, style = 'egyptian', children }: { locale: Locale; style?: ArabicStyle; children?: ReactNode }) {
  const selected = internationalEnabled() ? style : 'egyptian';
  useEffect(() => {
    if (!internationalEnabled()) return;
    for (const cookie of devicePreferenceCookies(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language)) {
      document.cookie = cookie;
    }
  }, []);
  return <LocaleContext key={locale} value={locale}><ArabicStyleContext value={selected}>{children}</ArabicStyleContext></LocaleContext>;
}
export function useArabicStyle() { return useContext(ArabicStyleContext); }
export function useLocale() {
  return useContext(LocaleContext);
}
export function useT<M extends Messages>(messages: M) {
  const locale = useLocale();
  const style = useArabicStyle();
  return useMemo(() => createT(messages, locale, style), [messages, locale, style]);
}
