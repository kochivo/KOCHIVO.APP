'use client';
import { useReducer, useState } from 'react';
import { LocaleProvider, useArabicStyle, useLocale } from '@/core/i18n/client';
import { GuidedScreen } from './guided-screen';
import type { DemoPlan } from './types';
import { initialState, reduceDemo } from './state';

const systemNow = () => Date.now();
export function GuidedEntry({ plans, now = systemNow }: { plans: readonly DemoPlan[]; now?: () => number }) {
  const initialLocale = useLocale(), style = useArabicStyle();
  const [locale, setLocale] = useState(initialLocale);
  const [state, dispatch] = useReducer(reduceDemo, 0, initialState);
  return <LocaleProvider locale={locale} style={style}>
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}><GuidedScreen plans={plans} state={state} dispatch={dispatch} now={now} onLanguage={() => setLocale(value => value === 'ar' ? 'en' : 'ar')} /></div>
  </LocaleProvider>;
}
