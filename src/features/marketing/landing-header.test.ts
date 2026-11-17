import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'ar' }) }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { Slogan } from './components/slogan';
import { SiteHeader } from './components/site-header';

describe('T-298 landing header and slogan', () => {
  it.each([false, true])('protects the English slogan from translation (final=%s)', async final => {
    const html = renderToStaticMarkup(await Slogan({ final }));
    const heading = html.match(/<h[12]\b[^>]*>/)?.[0] ?? '';
    expect(heading).toContain('translate="no"');
    expect(heading).toMatch(/class="[^"]*\bnotranslate\b/);
    expect(heading).toContain('dir="ltr"');
    expect(heading).toContain('lang="en"');
    expect(heading).toContain('aria-label="YOUR NEXT MOVE STARTS HERE."');
  });

  it('renders compact language and theme controls with translated labels', async () => {
    const html = renderToStaticMarkup(await SiteHeader());
    expect(html).toContain('role="group" aria-label="اللغة"');
    expect(html).toContain('English');
    expect(html).toContain('aria-label="شكل التطبيق: جهازك، غيّر لـفاتح"');
    expect(html).toMatch(/<button[^>]*aria-label="[^"]*"[^>]*><svg[^>]*class="[^"]*lucide-monitor/);
    const source = readFileSync('src/features/marketing/components/site-header.tsx', 'utf8');
    expect(source).toContain("from '@/ui/theme-switch'");
    expect(source).toContain('<ThemeSwitch compact />');
  });

  it('renders a visible 48px login link on phones and keeps signup on one line', async () => {
    const html = renderToStaticMarkup(await SiteHeader());
    const login = html.match(/<a[^>]*href="[^"]*login"[^>]*>دخول<\/a>/)?.[0] ?? '';
    expect(login).toContain('min-h-12');
    const css = readFileSync('src/features/marketing/components/landing.module.css', 'utf8');
    const phone = css.split('@media (max-width: 620px)')[1]?.split('@media')[0] ?? '';
    expect(phone).not.toMatch(/\.headerEnd\s*>\s*:not\(:last-child\)/);
    expect(phone).not.toMatch(/\.headerLogin\s*\{\s*display:\s*none;/);
    expect(css).toMatch(/\.headerSignup\s*\{[^}]*white-space:\s*nowrap/);
  });
});
