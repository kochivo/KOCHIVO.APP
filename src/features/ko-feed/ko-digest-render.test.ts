import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KoFeed } from '../ko-preview/components/ko-feed';

const view = vi.hoisted(() => ({ path: '/en/captain', rows: [] }));
vi.mock('next/navigation', () => ({ usePathname: () => view.path }));
vi.mock('./hooks/use-ko-feed', () => ({ useKoFeed: () => ({ rows: view.rows, status: 'ready',
  extras: null, saveError: false, refresh: vi.fn(), dismiss: vi.fn() }) }));

it.each(['ar', 'en'] as const)('shows the digest only on the captain feed in %s', locale => {
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(KoFeed, { avatar: () => createElement('img', { src: '/ko.png', alt: '' }) })));
  const clear = locale === 'ar' ? 'النهارده كله تمام' : 'All clear today';
  view.path = `/${locale}/captain`;
  expect(render()).toContain(clear);
  view.path = `/${locale}/player`;
  expect(render()).not.toContain(clear);
});
