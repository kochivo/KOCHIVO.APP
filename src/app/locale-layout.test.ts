import { expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const locale = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock('next/font/google', () => ({
  Manrope: () => ({ variable: 'manrope' }), Alexandria: () => ({ variable: 'alexandria' }), Changa: () => ({ variable: 'changa' }),
}));
vi.mock('@/core/i18n/server', () => ({ setRequestLocale: locale.set }));
vi.mock('@/core/pwa/register-sw', () => ({ RegisterServiceWorker: () => null }));

it('generates both locale variants statically and rejects other route params', async () => {
  const layout = await import('./[locale]/layout');
  expect(layout.generateStaticParams()).toEqual([{ locale: 'ar' }, { locale: 'en' }]);
  expect(layout.dynamicParams).toBe(false);
});

it.each([['ar', 'rtl'], ['en', 'ltr'], ['invalid', 'rtl']])('sets the root language and direction from params %s', async (value, direction) => {
  const { default: RootLayout } = await import('./[locale]/layout');
  const root = await RootLayout({ children: null, params: Promise.resolve({ locale: value }) }) as ReactElement<{ lang: string; dir: string }>;
  expect(root.props.lang).toBe(value === 'en' ? 'en' : 'ar');
  expect(root.props.dir).toBe(direction);
  expect(locale.set).toHaveBeenLastCalledWith(value === 'en' ? 'en' : 'ar');
});
