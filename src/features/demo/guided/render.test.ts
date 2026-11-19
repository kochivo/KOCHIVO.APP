import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { Intro } from './intro';
import { Summary } from './summary';
import { initialState } from './state';
import { Meals } from './meals';
import { PhoneFood } from './phone-food';
import { CaptainViews } from './captain-views';
import { GuideCard } from './guide-card';
import { Workout } from './workout';
import type { Page } from './steps';

it('shows the sum of the demo meals on both screens', () => {
  const props = { state: { ...initialState(0), eaten: [true, true, true, true] }, dispatch() {}, act() {}, now: () => 0 };
  const render = (view: typeof Meals | typeof PhoneFood) => renderToStaticMarkup(
    createElement(LocaleProvider, { locale: 'en' }, createElement(view, props)),
  );
  const meals = render(Meals);
  const values = [...meals.matchAll(/<small[^>]*>(\d+) calories<\/small>/g)].map(match => Number(match[1]));
  expect(values).toHaveLength(4);
  expect(values.reduce((sum, value) => sum + value, 0)).toBe(2250);
  expect(meals).toContain('2250 calories');
  expect(render(PhoneFood)).toContain('aria-valuemax="2250" aria-valuenow="2250"');
});

afterEach(() => vi.unstubAllEnvs());

it.each([
  ['ar', 'egyptian', 'علامة الصح جنب المجموعة', 'إنهاء المجموعة'],
  ['ar', 'standard', 'علامة الصح بجانب المجموعة', 'إنهاء المجموعة'],
  ['en', 'egyptian', 'check mark beside the set', 'Complete set'],
] as const)('uses the workout control name in the %s (%s) guide', (locale, style, hint, name) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const state = { ...initialState(0), step: 11, guide: 'open' as const };
  const props = { state, dispatch() {}, act() {}, now: () => 0 };
  const guide = createElement(GuideCard, { ...props, plans: [], onAccount() {} });
  const workout = createElement(Workout, props);
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, style }, guide, workout));
  expect(html).toContain(hint);
  expect(html).toMatch(new RegExp(`<p[^>]*>[^<]*${name}`));
  expect(html).toContain(`aria-label="${name}"`);
});

it('renders all four sizes and skip as accessible opening actions', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(Intro, { onChoose: () => undefined })));
  expect(html).toContain('How many players do you coach?');
  for (const size of ['1–5', '6–20', '21–40', '40+']) expect(html).toContain(size);
  expect(html.match(/<button/g)).toHaveLength(5);
});
it.each(['tasks', 'inbox', 'players', 'player', 'programs', 'food', 'assess', 'money', 'add'] as Page[])('renders the %s view with local fixtures', page => {
  const state = { ...initialState(0), intro: false, page };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(CaptainViews, { state, dispatch: () => undefined, act: () => undefined, now: () => 1000 })));
  expect(html.length).toBeGreaterThan(200);
  expect(html).not.toContain('undefined');
});
it('renders real plan prices, measured summary and both final destinations', () => {
  const state = { ...initialState(1000), n: 40, did: ['set', 'pay'], ended: 63000 };
  const plans = [{ name: 'ENTRY', price: 0, limit: 5 }, { name: 'CHAMPION', price: 399, limit: 20 }, { name: 'LEGEND', price: 699, limit: 40 }, { name: 'EMPIRE', price: 1499, limit: 100 }];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(Summary, { state, plans, now: 90000, onExplore: () => undefined, onAccount: () => undefined })));
  expect(html).toContain('1:02');
  expect(html).toContain('LEGEND');
  expect(html).toContain('699');
  expect(html).toContain('href="/#pricing"');
  expect(html).toContain('Try a sample account');
});
