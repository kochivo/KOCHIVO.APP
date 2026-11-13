import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainNav } from './components/captain-nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/captain/inbox' }));
vi.mock('@/ui', () => ({ BottomNav: () => null }));
vi.mock('./data/navigation-count', () => ({ fetchWaitingCount: async () => 0 }));
afterEach(() => vi.unstubAllEnvs());
it('hides the zero badge and preserves the unavailable screen-reader text', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const render = (waitingCount: number | null) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainNav, { waitingCount })));
  expect(render(0)).not.toContain('aria-label="0 متابعة');
  expect(render(null)).toContain('class="sr-only"');
  expect(render(null)).toContain('عدد المتابعات مش متاح دلوقتي');
  expect(render(0)).toContain('التمارين');
});

it('shows one food heading, the administration section and the real waiting badge', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(CaptainNav, { waitingCount: 17 })));
  expect(html.match(/<h2\b[^>]*>الأكل<\/h2>/g)).toHaveLength(1);
  expect(html).toContain('الإدارة');
  expect(html).toContain('المتابعة');
  expect(html).toContain('aria-label="17 متابعة مستنياك"');
  const inbox = html.match(/<a\b[^>]*href="\/captain\/inbox"[^>]*>/)?.[0];
  expect(inbox).toContain('aria-current="page"');
});
