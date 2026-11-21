import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { DemoLibrary } from './demo-library';
import { DemoPlayerNav } from './demo-player-nav';
import { DemoPhoneNav } from './demo-phone-nav';
import { Programs } from './programs';
import { Meals } from './meals';
import { initialState } from './state';

const props = { state: initialState(0), dispatch() {}, act() {}, now: () => 0 };
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));

it('keeps all five coach mobile controls local', () => {
  const html = render(createElement(DemoPhoneNav, { active: 'home', count: 3, more: false, onSelect() {}, onMore() {}, onAdd() {} }));
  expect(html.match(/<button/g)).toHaveLength(5);
  expect(html).toContain('demo-quick-add');
  expect(html).not.toContain('href=');
});
it('keeps the five player controls local', () => {
  const html = render(createElement(DemoPlayerNav, props));
  expect(html.match(/<button/g)).toHaveLength(5);
  expect(html).toContain('demo-player-workout');
  expect(html).not.toContain('href=');
});
it.each(['programs', 'food'] as const)('provides a local %s library', kind => {
  const html = render(createElement(DemoLibrary, { kind, onOpen() {} }));
  expect(html).toContain('type="search"');
  expect(html).toContain('Overview');
  expect(html).not.toContain('href=');
});
it('opens the training editor directly for its guided step', () => {
  expect(render(createElement(Programs, { ...props, state: { ...props.state, step: 7 } }))).toContain('data-demo-target="addex"');
});
it('opens the meal editor directly for its guided step', () => {
  expect(render(createElement(Meals, { ...props, state: { ...props.state, step: 8 } }))).toContain('data-demo-target="swap"');
});
it('renders an accessible shared theme switch', async () => {
  const { DemoHeader } = await import('./demo-header');
  const html = render(createElement(DemoHeader, { state: props.state, dispatch() {}, now: () => 0, onLanguage() {}, theme: 'dark', onTheme() {} }));
  expect(html).toContain('aria-label="Light theme"');
  expect(html).not.toContain('aria-label="Dark theme"');
});
