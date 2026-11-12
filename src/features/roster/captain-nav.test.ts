import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainNav } from './components/captain-nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/captain/inbox' }));
vi.mock('@/ui', () => ({ BottomNav: () => null }));
vi.mock('./data/navigation-count', () => ({ fetchWaitingCount: async () => 0 }));
afterEach(() => vi.unstubAllEnvs());

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
