'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { LocaleProvider, useArabicStyle, useLocale } from '@/core/i18n/client';
import { GuidedScreen } from './guided-screen';
import type { DemoPlan } from './types';
import { initialState, reduceDemo } from './state';
import type { Page } from './steps';

const pages: readonly Page[] = ['home', 'tasks', 'inbox', 'players', 'programs', 'food', 'assess', 'money', 'join', 'add'];

const systemNow = () => Date.now();
export function GuidedEntry({ plans, now = systemNow }: { plans: readonly DemoPlan[]; now?: () => number }) {
  const initialLocale = useLocale(), style = useArabicStyle();
  const [locale, setLocale] = useState(initialLocale);
  const [state, dispatch] = useReducer(reduceDemo, 0, initialState);
  const restored = useRef(false);
  // Keep the address bar in step with the screen, and open the screen named by the hash on load or refresh.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const wanted = window.location.hash.slice(1) as Page;
    if (!pages.includes(wanted)) return;
    dispatch({ type: 'start', n: 18, now: now() });
    dispatch({ type: 'patch', patch: { guide: 'closed' } });
    dispatch({ type: 'go', page: wanted, now: now() });
  }, [now]);
  useEffect(() => {
    if (!restored.current) return;
    const hash = state.intro ? '' : `#${state.page}`;
    if (window.location.hash !== hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  }, [state.intro, state.page]);
  return <LocaleProvider locale={locale} style={style}>
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}><GuidedScreen plans={plans} state={state} dispatch={dispatch} now={now} onLanguage={() => setLocale(value => value === 'ar' ? 'en' : 'ar')} /></div>
  </LocaleProvider>;
}
