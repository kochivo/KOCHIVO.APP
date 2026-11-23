import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CheckinEntry } from './checkin-entry';

it.each(['ar', 'en'] as const)('renders a labelled weekly check-in entry linking to the existing check-in in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(CheckinEntry)));
  expect(html).toContain(locale === 'ar' ? 'تحديث الأسبوع' : 'Weekly check-in');
  expect(html).toContain(locale === 'ar' ? 'ابعت وزنك ومقاساتك وصورك للكابتن' : 'Send your weight, measurements and photos to your coach');
  expect(html).toContain('href="/player/progress?checkin=1"');
  expect(html).toContain('min-h-12');
});
