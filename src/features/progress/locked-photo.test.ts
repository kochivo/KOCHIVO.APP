import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { LockedPhoto } from './components/locked-photo';
it('locks private thumbnails behind an accessible reveal button', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(LockedPhoto, {
    url: '/photo', alt: 'Front', locked: true, onError() {},
  })));
  expect(html).toContain('blur-md'); expect(html).toContain('Tap to view photo');
});
