import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'ar' }) }) }));
import { SiteFooter } from './components/site-footer';

it('keeps the complete footer credit in LTR order on an Arabic page', async () => {
  const html = renderToStaticMarkup(await SiteFooter());
  expect(html).toMatch(/<p dir="ltr">[^<]*KOCHIVO[^<]* · <a[^>]*href="https:\/\/gymvisual.com\/"[^>]*>© Gym visual<\/a><\/p>/);
});

it('reserves a separate desktop column for the hero phone instead of covering KPIs', () => {
  const css = readFileSync(new URL('./components/landing.module.css', import.meta.url), 'utf8');
  const stage = css.match(/\.stage\s*\{([^}]+)\}/)?.[1] ?? '';
  expect(stage).toContain('grid-template-columns: minmax(0, 1fr) 262px');
  const phone = css.match(/\.stagePhone\s*\{([^}]+)\}/)?.[1] ?? '';
  expect(phone).toContain('position: relative');
  expect(phone).not.toContain('position: absolute');
});

it('keeps the mobile money caption and payment detail on their own unbroken lines', () => {
  const css = readFileSync(new URL('./components/landing.module.css', import.meta.url), 'utf8');
  expect(css).toMatch(/\.money strong small\s*\{[^}]*display: block;[^}]*white-space: nowrap/);
  expect(css).toMatch(/\.moneyRows small\s*\{[^}]*white-space: nowrap/);
  expect(css).toMatch(/\.moneyRows > div\s*\{[^}]*flex-wrap: wrap/);
});
