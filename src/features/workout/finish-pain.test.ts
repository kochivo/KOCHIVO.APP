import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { FinishHero } from './components/finish-hero';

const state = vi.hoisted(() => ({ skipped: 3, sets: 0, locale: 'en' as 'en' | 'ar' | 'arStd' }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useCallback: <T,>(value: T) => value, useEffect: () => {}, useState: (value: unknown) => [value, () => {}],
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => state.locale === 'arStd' ? 'ar' : state.locale,
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, state.locale === 'arStd' ? 'ar' : state.locale,
    state.locale === 'arStd' ? 'standard' : 'egyptian') }));
vi.mock('@/lib/ranks-enabled', () => ({ ranksEnabled: () => false }));
vi.mock('@/core/offline', () => ({ useLiveQuery: () => ({ painSkipped: state.skipped,
  sets: state.sets, minutes: 0, volume: 0, records: 0, expectedPrs: 0, exercises: [], recordName: '' }) }));

it.each(['en', 'ar', 'arStd'] as const)('replaces congratulations with the pain outcome in %s', locale => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  state.locale = locale;
  try {
    state.skipped = 3; state.sets = 0;
    const stopped = renderToStaticMarkup(createElement(FinishHero, { sessionId: 'session' }));
    expect(stopped).toContain(locale === 'en' ? 'We stopped today' : locale === 'ar' ? 'وقفنا تمرين النهارده' : 'أوقفنا تمرين اليوم');
    state.sets = 2;
    const safe = renderToStaticMarkup(createElement(FinishHero, { sessionId: 'session' }));
    expect(safe).toContain(locale === 'en' ? 'You finished the safe exercises' : locale === 'ar' ? 'خلصت التمارين الآمنة' : 'أنهيت التمارين الآمنة');
    expect(safe).not.toContain(locale === 'en' ? 'We stopped today' : locale === 'ar' ? 'وقفنا تمرين النهارده' : 'أوقفنا تمرين اليوم');
    state.skipped = 0;
    const normal = renderToStaticMarkup(createElement(FinishHero, { sessionId: 'session' }));
    expect(normal).toContain(locale === 'en' ? 'Well done!' : locale === 'ar' ? 'عاش عليك!' : 'أحسنت!');
    expect(normal).not.toContain(locale === 'en' ? 'Your coach knows' : locale === 'ar' ? 'عشان الوجع' : 'بسبب الألم');
    expect(normal).not.toEqual(safe);
  } finally { vi.unstubAllEnvs(); }
});
