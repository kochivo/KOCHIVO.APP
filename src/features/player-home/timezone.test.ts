import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { TimezoneContext } from '@/core/timezone/client';
import { Greeting } from './components/greeting';

afterEach(() => vi.unstubAllEnvs());
const now = new Date('2026-01-01T21:30:00Z');
const render = (zone: string) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(TimezoneContext, { value: zone }, createElement(Greeting, { now }))));
it('keeps flag-off greetings byte-identical regardless of profile timezone', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(render('Asia/Dubai')).toBe(render('Africa/Cairo'));
});
it('shows the player day after midnight in Dubai', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(render('Asia/Dubai')).toContain('2 January');
  expect(render('America/New_York')).toContain('1 January');
});
