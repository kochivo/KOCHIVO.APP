import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { SettingsProfile } from '../schema';
import { WorkspacePageCard } from './workspace-page-card';
import { WorkspaceLanguageCard } from './workspace-language-card';
import { CaptainSettings } from './captain-settings';

const mocks = vi.hoisted(() => ({ resource: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: mocks.resource }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/demo', () => ({ demoExpiry: () => null, useDemoExpiry: () => null }));
vi.mock('@/features/billing', () => ({ SubscriptionEntry: () => null }));
vi.mock('../data/captain-avatar', () => ({ captainAvatarUrl: vi.fn() }));
vi.mock('../data/workspace-settings', () => ({ loadCaptainSettings: vi.fn() }));
vi.mock('../data/preferences', () => ({ saveCaptainPreferences: vi.fn() }));
vi.mock('../data/language', () => ({ saveLanguage: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh() {} }),
  useSearchParams: () => new URLSearchParams('section=security'),
}));
vi.mock('../data/settings', () => ({ saveInviteMessage: vi.fn() }));
const profile: SettingsProfile = { id: 'captain', role: 'captain', full_name: 'Ali', phone: null,
  invite_message: null, deletion_requested_at: null, bio: 'Strength coach', public_slug: 'ali', timezone: 'Africa/Cairo' };
afterEach(() => vi.unstubAllEnvs());

it('renders the real public link, preview and copy control without repeating the profile', () => {
  const html = renderToStaticMarkup(createElement(WorkspacePageCard, { slug: profile.public_slug }));
  for (const field of ['kochivo.site/c/ali', 'href="/c/ali"', 'انسخ']) expect(html).toContain(field);
  expect(html).not.toContain('Ali');
  expect(html).not.toContain('Strength coach');
});

it('does not invent a link, bio or gallery count for missing profile data', () => {
  const html = renderToStaticMarkup(createElement(WorkspacePageCard, { slug: null }));
  expect(html).not.toContain('href=');
  expect(html).not.toContain('مدرب أونلاين');
  expect(html).not.toContain('الصور والشهادات');
});

it.each([true, false, undefined])('shows automatic time only when explicitly stored as true (%s)', automatic => {
  const html = renderToStaticMarkup(createElement(WorkspaceLanguageCard, { profile: { ...profile, timezone_auto: automatic } }));
  expect(html.includes('(تلقائي)')).toBe(automatic === true);
  expect(html).toContain('القاهرة');
  expect(html).toContain('عربي');
  expect(html).not.toContain('مصري');
});

it('shows only Arabic or English, never an Arabic style', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const [locale, style, expected] of [['ar', 'standard', 'عربي'], ['en', 'egyptian', 'English']] as const) {
    expect(renderToStaticMarkup(createElement(LocaleProvider, { locale, style }, createElement(WorkspaceLanguageCard, { profile })))).toContain(expected);
  }
});

it('leaves payment activation states and category toggles absent when no preferences are stored', () => {
  mocks.resource.mockReturnValue({ data: profile });
  const html = renderToStaticMarkup(createElement(CaptainSettings, { signOut: createElement('button', null, 'sign-out') }));
  for (const field of ['انستاباي', 'فودافون كاش', 'تحويل بنكي', 'مفعّل', 'رسالة جديدة', 'فيديو أداء', 'دفعة جديدة', 'ملخص الصبح']) expect(html).not.toContain(field);
  expect(html).toContain('sign-out');
  expect(html).toContain('section=profile');
  expect(html).toContain('section=language');
  expect(html).not.toContain('id="settings-profile"');
  expect(html.indexOf('id="settings-security"')).toBeLessThan(html.indexOf('sign-out'));
});
