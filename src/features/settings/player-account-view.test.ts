import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerAccount } from './components/player-account';
import type { SettingsProfile } from './schema';
import { GlassToggle } from './components/glass-toggle';
import { ThemeSwitch } from '@/ui/theme-switch';
import { TourReplay } from '@/ui/tour-replay';

vi.hoisted(() => { process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ''; });
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {}, push() {} }) }));
vi.mock('@/features/player-shell', () => ({ useCaptainContext: () => ({ data: { fullName: 'Real captain', accessUntil: '2026-12-15' } }) }));
vi.mock('@/features/player-home', () => ({ CycleEntry: () => null, useProgramSnapshot: () => ({ snapshot: { title: 'Actual plan' } }) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: 'ready', data: { sessions: [], tier: 'champion' } }) }));
vi.mock('@/core/offline', () => ({ localDb: () => ({ userId: 'player' }), useLiveQuery: () => [] }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T10:00:00Z') }) }));
afterEach(() => vi.unstubAllEnvs());
const profile: SettingsProfile = { id: 'player', role: 'player', full_name: 'Actual player', phone: null, invite_message: null, deletion_requested_at: null };

it('binds identity, plan, subscription and existing rank, retaining editing and sign-out', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(PlayerAccount, {
    profile, onProfileSave() {}, profileForm: createElement('form', { 'aria-label': 'Profile and timezone editor' }),
    install: createElement('button', null, 'Install app'), signOut: createElement('button', null, 'Sign out'),
    privacy: [createElement('button', { key: 'export' }, 'Export data'), createElement('button', { key: 'delete' }, 'Delete account')],
  }, [createElement(GlassToggle, { key: 'glass' }), createElement(ThemeSwitch, { key: 'theme' }),
      createElement(TourReplay, { key: 'tour', role: 'player' })])));
  for (const content of ['Actual player', 'Real captain', 'Actual plan', '15 ديسمبر', 'بطل', 'يوم ورا بعض',
    'اللغة', 'الشكل', 'فكّرني بالتمرين', 'الوزن بـ', 'ازاي تستخدم التطبيق', 'المزيد', 'عربي', 'English',
    'Profile and timezone editor', 'Install app', 'Export data', 'Delete account', 'Sign out', 'KO']) expect(html).toContain(content);
  expect(html).not.toContain('فصحى');
  expect(html).toContain('aria-label="غيّر صورة البروفايل"');
  expect(html).toContain('href="/player"');
  expect(html).toContain('href="/ar/player/captain/profile"');
  expect(html).toMatch(/<details[^>]*group\/privacy[^>]*>.*الخصوصية.*Export data.*Delete account.*<\/details>/);
  expect(html).toContain('glass overflow-hidden rounded-card');
  expect(html).toContain('min-h-14');
  expect(html).toContain('text-danger!');
});
