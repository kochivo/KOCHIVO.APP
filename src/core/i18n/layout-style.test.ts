import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider, useT } from './client';
import type { ArabicStyle, Locale } from './locale';
import { defineMessages } from './messages';
import RootLayout from '@/app/[locale]/layout';

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, profile: 'standard', claims: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (key: string) => key === 'kochivo.arabic' && state.cookie ? { value: state.cookie } : undefined }),
  headers: async () => ({ get: () => 'ar-SA' }),
}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: state.claims },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { arabic_style: state.profile, timezone: 'Africa/Cairo' } }) }) }) }),
}) }));
vi.mock('next/font/google', () => ({ Alexandria: () => ({ variable: 'arabic' }), Changa: () => ({ variable: 'display' }), Manrope: () => ({ variable: 'latin' }) }));
vi.mock('@/app/[locale]/site-metadata', () => ({ siteMetadata: () => ({}) }));
vi.mock('@/ui/site-analytics', () => ({ SiteAnalytics: () => null }));
vi.mock('@/ui/orbs', () => ({ Orbs: () => null }));
vi.mock('@/ui/mobile-viewport', () => ({ MobileViewport: () => null }));
vi.mock('@/ui/in-app-browser-warning', () => ({ InAppBrowserWarning: () => null }));
vi.mock('@/core/pwa/register-sw', () => ({ RegisterServiceWorker: () => null }));
vi.mock('@/ui/toast', () => ({ ToastProvider: ({ children }: { children: ReactNode }) => children }));

const messages = defineMessages({ ar: { now: 'دلوقتي' }, en: { now: 'Now' }, arStd: { now: 'الآن' } });
function Copy() { const t = useT(messages); return createElement('p', null, t('now')); }
type ProviderProps = { locale: Locale; style?: ArabicStyle; children?: ReactNode };
function providerIn(node: ReactNode): ReactElement<ProviderProps> | undefined {
  for (const child of Array.isArray(node) ? node : [node]) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === LocaleProvider) return child as ReactElement<ProviderProps>;
    const found = providerIn(child.props.children);
    if (found) return found;
  }
}
async function layoutProvider() {
  const tree = await RootLayout({ params: Promise.resolve({ locale: 'ar' }), children: createElement(Copy) });
  const provider = providerIn(tree);
  if (!provider) throw new Error('Missing locale provider');
  return provider;
}
beforeEach(() => {
  vi.clearAllMocks(); state.cookie = undefined;
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  state.claims.mockResolvedValue({ data: { claims: { sub: 'owner' } } });
});
afterEach(() => vi.unstubAllEnvs());
it('renders client copy in the cookie style on the first server render', async () => {
  state.cookie = 'standard';
  const provider = await layoutProvider();
  expect(provider.props.style).toBe('standard');
  expect(renderToStaticMarkup(provider)).toBe('<p>الآن</p>');
  expect(state.claims).not.toHaveBeenCalled();
});
it('passes the saved profile style when there is no manual cookie', async () => {
  const provider = await layoutProvider();
  expect(provider.props.style).toBe('standard');
  expect(renderToStaticMarkup(provider)).toBe('<p>الآن</p>');
});
it('preserves the legacy provider markup byte for byte with the flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0'); state.cookie = 'standard';
  const provider = await layoutProvider();
  const legacy = createElement(LocaleProvider, { locale: provider.props.locale }, provider.props.children);
  expect(provider.props.style).toBe('egyptian');
  expect(renderToStaticMarkup(provider)).toBe(renderToStaticMarkup(legacy));
  expect(renderToStaticMarkup(provider)).toBe('<p>دلوقتي</p>');
  expect(state.claims).not.toHaveBeenCalled();
});
