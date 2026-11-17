import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FreezeSettings } from './freeze-settings';

const state = vi.hoisted(() => ({
  data: { default_days: 7 } as { default_days: number | null } | undefined, status: 'ready',
  retry: vi.fn(), mutate: vi.fn(),
}));
vi.mock('@/core/resource', () => ({ useResource: () => state }));
vi.mock('../data/freeze-settings', () => ({ loadFreezeSettings: vi.fn(), saveFreezeSettings: vi.fn() }));
beforeEach(() => { state.data = { default_days: 7 }; state.status = 'ready'; });
const render = (locale: 'ar' | 'en' = 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FreezeSettings)));

it('renders the clearable number setting and hint in English and Egyptian Arabic', () => {
  const html = render();
  expect(html).toContain('Freeze days for subscriptions without a package');
  expect(html).toContain('value="7"');
  expect(html).toContain('inputMode="numeric"');
  expect(html).toContain('min-h-12');
  expect(render('ar')).toContain('أيام التجميد لأي اشتراك من غير باقة');
  state.data = { default_days: null };
  expect(render()).toContain('value=""');
});
it('shows loading and a retryable load error', () => {
  state.data = undefined;
  state.status = 'loading';
  expect(render()).toContain('Loading freeze settings');
  state.status = 'error';
  expect(render()).toContain('Could not load freeze settings');
  expect(render()).toContain('Try again');
});
