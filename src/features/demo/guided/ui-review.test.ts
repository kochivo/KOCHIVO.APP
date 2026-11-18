import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { marketingMessages as messages } from '@/features/marketing';
import { guidedMessages } from './messages';
import { DemoHeader } from './demo-header';
import { GuideCard } from './guide-card';
import { Summary } from './summary';
import { WeightChart } from './weight-chart';
import { initialState, reduceDemo } from './state';
import type { DemoState } from './state';
import { readFileSync } from 'node:fs';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());
const plans = [{ name: 'ENTRY', price: 0, limit: 5 }, { name: 'CHAMPION', price: 399, limit: 20 }];
const wrap = (child: ReactNode) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, child));

it('anchors the mobile captain navigation to the viewport rather than short content', () => {
  const css = readFileSync(new URL('./guided.css', import.meta.url), 'utf8');
  const mobile = css.split('@media (width < 760px)')[1] ?? '';
  expect(mobile).toMatch(/\.demo-captain-side > nav\s*\{[^}]*position: fixed;[^}]*inset-block-end:/);
});

it('keeps the guide and its resume button above the mobile captain nav', () => {
  const css = readFileSync(new URL('./guided.css', import.meta.url), 'utf8');
  expect(css).toMatch(/data-view='captain'\]\) :is\(\.demo-guide, \.demo-resume\) \{[^}]*inset-block-end: calc\(var\(--demo-nav-height\)/);
  expect(css).toMatch(/\.demo-captain-side > nav[^}]*block-size: var\(--demo-nav-height\)/);
});

it('keeps language and restart available in the compact header', () => {
  const html = wrap(createElement(DemoHeader, { state: initialState(0), dispatch() {}, now: () => 0, onLanguage() {} }));
  const menu = html.match(/<details[^>]*>[\s\S]*?<\/details>/)?.[0];
  expect(menu).toContain('aria-label="Demo options"');
  expect(menu).toContain(guidedMessages.en.languageSwitch);
  expect(menu).toContain(guidedMessages.en.restart);
});

it('gives mobile task text a full row before its action button', () => {
  const css = readFileSync(new URL('./guided.css', import.meta.url), 'utf8');
  const mobile = css.split('@media (width < 760px)')[1] ?? '';
  expect(mobile).toMatch(/\.demo-tasks li\s*\{[^}]*flex-wrap: wrap/);
  expect(mobile).toMatch(/\.demo-tasks li > :first-child\s*\{[^}]*flex-basis: 100%/);
});

it('keeps the signed chart value separated and bidi-isolated', () => {
  expect(wrap(createElement(WeightChart))).toMatch(/Weight over 8 weeks<\/span><bdi[^>]*dir="ltr"[^>]*>−3.4 kg<\/bdi>/);
});

it('translates each standard Arabic exercise name', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const t = createT(guidedMessages, 'ar', 'standard');
  for (const key of ['exercises', 'library', 'bench'] as const) {
    for (const name of t(key).split('|')) expect(name).toMatch(/[\u0600-\u06ff]/);
  }
  const english = createT(guidedMessages, 'en');
  expect(english('bench')).toBe('Bench press');
  for (const key of ['exercises', 'library'] as const) expect(english(key)).not.toMatch(/[\u0600-\u06ff]/);
});

it.each([
  ['egyptian', 1, 'لاعب'], ['egyptian', 2, 'لاعبين'], ['egyptian', 3, 'لاعبين'], ['egyptian', 20, 'لاعب'],
  ['standard', 1, 'لاعب'], ['standard', 2, 'لاعبان'], ['standard', 3, 'لاعبين'], ['standard', 20, 'لاعباً'],
] as const)('uses %s plurals for %s players', (style, n, label) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style },
    createElement(Summary, { state: { ...initialState(0), n }, plans, now: 17000, onExplore() {}, onAccount() {} })));
  expect(html).toContain(`>${label}</span>`);
  expect(html).toContain('>الوقت</span>');
});

it.each([['ar', 'egyptian'], ['ar', 'standard'], ['en', 'egyptian']] as const)('advertises the same four-minute demo in %s/%s', (locale, style) => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const landing = createT(messages, locale, style)('demoGuide');
  const guide = createT(guidedMessages, locale, style)('guideTitle');
  expect(landing).toContain('4');
  expect(landing).toBe(guide);
});

it.each([1, 2, 20])('labels the summary player count with the right plural for %s', n => {
  const html = wrap(createElement(Summary, { state: { ...initialState(0), n }, plans, now: 17000, onExplore() {}, onAccount() {} }));
  expect(html).toContain(n === 1 ? '>Player</span>' : '>Players</span>');
  expect(html).toContain('>Time</span>');
  expect(html).toContain('0:17');
});

it('only claims the set arrived after a set event, including after skipping to the end', () => {
  let state: DemoState = { ...initialState(0), intro: false };
  for (let i = 0; i < 12; i++) state = reduceDemo(state, { type: 'next', now: 17000 });
  const render = (value: DemoState) => wrap(createElement(GuideCard, { state: value, plans, now: () => 17000, dispatch() {}, onAccount() {} }));
  expect(render(state)).not.toContain('Mohamed’s set arrived live.');
  const edited = reduceDemo(state, { type: 'edit-set', index: 0, kg: 70, reps: 9 });
  expect(render(edited)).not.toContain('Mohamed’s set arrived live.');
  expect(render(reduceDemo(state, { type: 'event', event: 'set', now: 17000 }))).toContain('Mohamed’s set arrived live.');
});
