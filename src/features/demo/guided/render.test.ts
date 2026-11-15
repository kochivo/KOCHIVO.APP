import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { Intro } from './intro';
import { Summary } from './summary';
import { initialState } from './state';
import { CaptainViews } from './captain-views';
import type { Page } from './steps';


it('renders all four sizes and skip as accessible opening actions', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(Intro, { onChoose: () => undefined })));
  expect(html).toContain('How many players do you coach?');
  for (const size of ['1–5', '6–20', '21–40', '40+']) expect(html).toContain(size);
  expect(html.match(/<button/g)).toHaveLength(5);
});
it.each(['inbox', 'players', 'player', 'programs', 'food', 'assess', 'money', 'add'] as Page[])('renders the %s view with local fixtures', page => {
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
