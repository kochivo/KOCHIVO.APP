import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainSettings } from './components/captain-settings';

const state = vi.hoisted(() => ({ planError: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('../billing/data/subscription', () => ({ loadSubscription: vi.fn() }));
vi.mock('./data/settings', () => ({ loadSettings: vi.fn() }));
// The real entry is a lazy wrapper; render the view directly in static markup.
vi.mock('@/features/billing/components/subscription-entry', async () => ({
  SubscriptionEntry: (await import('@/features/billing/components/subscription-view')).SubscriptionView,
}));
vi.mock('./data/preferences', () => ({ saveCaptainPreferences: vi.fn() }));
vi.mock('./data/language', () => ({ saveLanguage: vi.fn() }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null, demoExpiry: () => null }));
vi.mock('@/core/resource', () => ({ useResource: (key: string) => ({
  data: key === 'billing:subscription' ? state.planError ? undefined : {
    plan: { tier: 'entry', price_egp: 0, player_limit: 15 }, used: 12, subscriptionEnd: null,
  } : { id: 'captain', role: 'captain', full_name: 'Ali', phone: null, invite_message: null, deletion_requested_at: null },
  error: key === 'billing:subscription' && state.planError ? new Error('offline') : undefined,
  retry: vi.fn(), mutate: vi.fn(),
}) }));
afterEach(() => { state.planError = false; vi.unstubAllEnvs(); });
function render() {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainSettings)));
}
it('places the plan and usage in settings with exactly one upgrade action', () => {
  const html = render();
  expect(html).toContain('اشتراكي');
  expect(html).toContain('البداية');
  expect(html).toContain('من 15 لاعب');
  expect(html.match(/>رقّي باقتك<\/a>/g)).toHaveLength(1);
  expect(html).not.toContain('كبّر الباقة');
});
it('keeps plan errors visible and retryable within settings', () => {
  state.planError = true;
  const html = render();
  expect(html).toContain('مش قادرين نحمّل باقتك');
  expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('رقّي باقتك');
});
