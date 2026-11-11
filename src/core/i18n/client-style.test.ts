import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider, useT } from './client';
import { defineMessages } from './messages';

const messages = defineMessages({ ar: { now: 'دلوقتي' }, en: { now: 'Now' }, arStd: { now: 'الآن' } });
function Copy() { const t = useT(messages); return createElement('p', null, t('now')); }
afterEach(() => vi.unstubAllEnvs());
it('renders client translations in the server-provided style before hydration', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' }, createElement(Copy)))).toBe('<p>الآن</p>');
});
it('preserves the exact Egyptian markup with the flag off', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' }, createElement(Copy)))).toBe('<p>دلوقتي</p>');
});
