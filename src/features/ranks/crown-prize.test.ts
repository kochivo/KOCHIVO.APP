import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CrownRace } from './components/crown-race';
import { RankScreen } from './components/rank-screen';

it.each(['ar', 'en'] as const)('shows a prize as escaped text or nothing in %s', locale => {
  const points = { lifetime: 0, tier: 'beginner' as const, monthly: 0, month_position: 1,
    adherence: 0, done: 0, planned: 8, crown_needs_workouts: 4, crown_gap: 1, logs: [] };
  const render = (prize?: string | null) => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(CrownRace, { points: { ...points, crown_prize: prize }, holdsCrown: false })));
  const html = render('<b>Free session</b>');
  expect(html).toContain(locale === 'ar' ? 'جايزة التاج:' : 'Crown prize:');
  expect(html).toContain('&lt;b&gt;Free session&lt;/b&gt;');
  expect(html).toContain('lucide-gift');
  expect(html).toContain('aria-hidden="true"');
  expect(render(null)).not.toContain('lucide-gift');
  expect(render()).not.toContain(locale === 'ar' ? 'جايزة التاج:' : 'Crown prize:');
  const screen = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(RankScreen, {
    data: { points: { ...points, crown_prize: 'Free session' }, board: [] }, status: 'ready',
  })));
  expect(screen).toContain(locale === 'ar' ? 'جايزة التاج: Free session' : 'Crown prize: Free session');
});
