import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { CoachLinkCard } from './components/coach-link-card';

const state = vi.hoisted(() => ({ slug: 'ali-coach' as string | null, fail: false, locale: 'en' as 'ar' | 'en' }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
vi.mock('@/core/i18n/server', () => ({ getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, state.locale) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain-id' } }, error: null }) },
  from: (table: string) => {
    expect(table).toBe('profiles');
    return { select: (fields: string) => {
      expect(fields).toBe('public_slug');
      return { eq: (field: string, id: string) => {
        expect([field, id]).toEqual(['id', 'captain-id']);
        return { single: async () => {
          if (state.fail) throw new Error('offline');
          return { data: { public_slug: state.slug }, error: null };
        } };
      } };
    } };
  },
}) }));
beforeEach(() => { state.slug = 'ali-coach'; state.fail = false; state.locale = 'en'; });
async function render() {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: state.locale }, await CoachLinkCard()));
}
it.each(['en', 'ar'] as const)('shows a valid LTR page link and copy status in %s', async locale => {
  state.locale = locale;
  const html = await render();
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('kochivo.site/c/ali-coach');
  expect(html).toContain('<button');
  expect(html).toContain('role="status"');
  expect(html).not.toContain('/captain/settings');
});
it.each([null, 'admin', '../bad'])('offers settings for an unset or invalid slug %s', async slug => {
  state.slug = slug;
  const html = await render();
  expect(html).toContain('href="/captain/settings"');
  expect(html).not.toContain('<button');
});
it('contains profile read failures inside the card', async () => {
  state.fail = true;
  const html = await render();
  expect(html).toContain('role="alert"');
  expect(html).toContain('Your page link');
  expect(html).not.toContain('/captain/settings');
});
