import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { SyncPill } from './sync-pill';

it.each(['ar', 'en'] as const)('renders attention and a full-size retry control in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(SyncPill, { state: 'attention', onRetry: () => undefined })));
  expect(html).toContain(locale === 'ar' ? 'فيه تسجيلات متبعتتش' : 'Some entries were not sent');
  expect(html).toContain(locale === 'ar' ? 'جرّب تاني' : 'Try again');
  expect(html).toContain('<button');
  expect(html).toContain('min-h-12');
});
