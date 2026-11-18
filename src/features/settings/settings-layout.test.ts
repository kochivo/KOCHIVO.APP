import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CaptainSettings } from './components/captain-settings';

vi.mock('server-only', () => ({}));
const query = vi.hoisted(() => ({ section: 'language' as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh() {} }),
  useSearchParams: () => new URLSearchParams(query.section ? { section: query.section } : {}),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: {
  full_name: 'Ali', public_slug: 'ali', timezone: 'Africa/Cairo', timezone_auto: true, units: 'metric',
}, mutate() {} }) }));
vi.mock('@/features/demo', () => ({ demoExpiry: () => null, useDemoExpiry: () => null }));
vi.mock('@/features/billing', () => ({ SubscriptionEntry: () => null }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: null }) }));
vi.mock('./data/workspace-settings', () => ({ loadCaptainSettings() {} }));
vi.mock('./data/settings', () => ({ saveInviteMessage: vi.fn() }));
vi.mock('./data/language', () => ({ saveLanguage() {} }));
vi.mock('./data/preferences', () => ({ saveCaptainPreferences() {} }));

it('renders one language and timezone card with its editable controls', () => {
  const html = renderToStaticMarkup(createElement(CaptainSettings));
  expect(html).toContain('اللغة والإشعارات');
  expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>.*?اللغة والإشعارات/);
  expect(html).toContain('English');
  expect(html).toContain('aria-pressed');
});

it('shows sign-out only in security and falls back to account for unknown sections', () => {
  const props = { signOut: createElement('button', null, 'sign-out') };
  query.section = 'security';
  const security = renderToStaticMarkup(createElement(CaptainSettings, props));
  expect(security).toContain('sign-out');
  expect(security).not.toContain('English');
  query.section = 'unknown';
  const account = renderToStaticMarkup(createElement(CaptainSettings, props));
  expect(account).toMatch(/<a[^>]*aria-current="page"[^>]*>.*?حسابك/);
  expect(account).not.toContain('sign-out');
});

it.each(['profile', 'page', 'invite', 'language', 'subscription', 'security'])('renders only the %s section from the URL', section => {
  query.section = section;
  const html = renderToStaticMarkup(createElement(CaptainSettings));
  expect(html.match(/id="settings-(?:profile|page|invite|language|subscription|security)"/g)).toEqual([`id="settings-${section}"`]);
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toMatch(new RegExp(`<a[^>]*aria-current="page"[^>]*href="\\?section=${section}"`));
});

it('shows phone overview links, the public page and sign out alongside the desktop profile default', () => {
  query.section = null;
  const html = renderToStaticMarkup(createElement(CaptainSettings, { signOut: createElement('button', null, 'sign-out') }));
  expect(html).toMatch(/md:hidden[^]*href="\/c\/ali"/);
  expect(html).toContain('شغالة');
  expect(html).toContain('انسخ');
  expect(html).toContain('sign-out');
  expect(html).toContain('href="?section=language#settings-notifications"');
  expect(html).toContain('max-md:hidden');
  expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\?section=profile"/);
});
