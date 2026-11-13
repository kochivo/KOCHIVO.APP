import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainQuestion } from './components/captain-question';

vi.mock('react', async original => ({ ...await original<typeof React>(), useState: () => ['  سؤال & تمرين  ', () => {}] }));
afterEach(() => vi.unstubAllEnvs());
it.each(['0', '1'])('retains the same encoded WhatsApp send and recording links with flag %s', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(CaptainQuestion, { contactUrl: 'https://wa.me/201012345678' })));
  expect(html).toContain('href="https://wa.me/201012345678?text=%D8%B3%D8%A4%D8%A7%D9%84%20%26%20%D8%AA%D9%85%D8%B1%D9%8A%D9%86"');
  expect(html).toContain('href="https://wa.me/201012345678"');
  if (flag === '1') expect(html).toContain('placeholder="اكتب للكابتن"');
});
it('keeps missing contact disabled and does not generate a send URL', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(CaptainQuestion));
  expect(html).toContain('disabled=""');
  expect(html).toContain('الكابتن لسه محطش رقمه');
  expect(html).not.toContain('href=');
});
