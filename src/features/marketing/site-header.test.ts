import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'ar' }) }) }));
import { SiteHeader } from './components/site-header';

it('keeps the real logo, primary signup and desktop section navigation', async () => {
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('data-reading');
  expect(html).toContain('pt-[var(--safe-top)]');
  expect(html).toContain('logo-primary.png');
  expect(html).toContain('ابدأ مجاناً');
  expect(html).toContain('name="tab" value="signup"');
  expect(html).toContain('href="#day"');
  expect(html).toContain('hidden items-center gap-5 text-sm lg:flex');
  expect(html).not.toContain('aria-expanded');
});
