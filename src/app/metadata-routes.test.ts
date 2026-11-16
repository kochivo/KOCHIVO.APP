import { expect, it } from 'vitest';
import sitemap from './sitemap';
import robots from './robots';

it('lists only existing public pages in both locales', () => {
  expect(sitemap().map(entry => entry.url)).toEqual([
    'https://kochivo.site/ar', 'https://kochivo.site/ar/login', 'https://kochivo.site/ar/demo',
    'https://kochivo.site/ar/privacy', 'https://kochivo.site/ar/terms',
    'https://kochivo.site/en', 'https://kochivo.site/en/login', 'https://kochivo.site/en/demo',
    'https://kochivo.site/en/privacy', 'https://kochivo.site/en/terms',
  ]);
});

it('allows public crawling, excludes private routes and links the sitemap', () => {
  expect(robots()).toEqual({
    rules: { userAgent: '*', allow: '/', disallow: ['/captain', '/player', '/admin', '/api', '/dev'] },
    sitemap: 'https://kochivo.site/sitemap.xml',
  });
});
