import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'ar' }) }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { SiteHeader } from './components/site-header';

it('keeps the real logo, primary signup and desktop section navigation', async () => {
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('pt-[var(--safe-top)]');
  expect(html).toContain('logo-primary.png');
  expect(html).toContain('ابدأ مجاناً');
  expect(html).toContain('href="/login?tab=signup"');
  expect(html).toContain('href="#inside"');
  expect(html).toContain('href="#player"');
  expect(html).toContain('href="/demo"');
  expect(html).not.toContain('aria-expanded');
});

it('renders language and sign-in controls', async () => {
  const html = renderToStaticMarkup(await SiteHeader());
  expect(html).toContain('role="group" aria-label="اللغة"');
  expect(html).toContain('English');
  expect(html).toMatch(/<a href="\/login"[^>]*>دخول<\/a>/);
});
