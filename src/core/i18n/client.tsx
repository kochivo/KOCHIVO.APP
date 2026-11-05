'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LOCALE } from './locale';
import type { Locale } from './locale';
import { createT } from './messages';
import type { Messages } from './messages';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);
export function LocaleProvider({ locale, children }: { locale: Locale; children?: ReactNode }) {
  return <LocaleContext key={locale} value={locale}>{children}</LocaleContext>;
}
export function useLocale() {
  return useContext(LocaleContext);
}
export function useT<M extends Messages>(messages: M) {
  const locale = useLocale();
  return useMemo(() => createT(messages, locale), [messages, locale]);
}
