import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FeedbackButton } from './components/feedback-button';

afterEach(() => { vi.unstubAllEnvs(); });

const render = (role: 'captain' | 'player', locale: 'ar' | 'en' = 'ar') =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FeedbackButton, { role })));

it('hides the floating feedback target on workspace phones and preserves its desktop placement', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = render('captain');
  expect(html).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(html).toContain('lg:static');
  expect(html).toContain('max-md:hidden!');
  expect(html).not.toContain('lg:bottom-6');
  expect(html).toContain('min-h-12');
  expect(html).toContain('aria-label="بلّغ عن مشكلة"');
});
it('renders an inline translated feedback action in More', () => {
  const html = renderToStaticMarkup(createElement(FeedbackButton, { role: 'captain', placement: 'more' }));
  expect(html).toContain('ابعت ملاحظة');
  expect(html).not.toContain('data-floating-fab');
});
it('keeps the floating captain button when the workspace flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '');
  const html = render('captain');
  expect(html).toContain('lg:bottom-6');
  expect(html).not.toContain('lg:static');
});
it('retains player placement when captain feedback moves into the sidebar', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = render('player', 'en');
  expect(html).toContain('lg:bottom-6');
  expect(html).not.toContain('lg:static');
  expect(html).toContain('aria-label="Report a problem"');
});
