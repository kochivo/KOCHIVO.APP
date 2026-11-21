import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { PendingIntake } from './components/pending-intake';

const state = vi.hoisted(() => ({ locale: 'en' as 'ar' | 'en', intake: null as object | null, error: null as string | null }));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => state.locale,
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, state.locale) }));
vi.mock('./data/intake', () => ({ saveIntake: vi.fn(), loadIntake: async () => ({
  profile: { full_name: 'Ali', social: {}, captain_intake: state.intake }, error: state.error,
}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('@/features/notifications', () => ({ PushToggleCard: () => null }));
vi.mock('@/features/auth/data/sign-out', () => ({ signOut: vi.fn() }));
vi.mock('@/features/auth/data/clear-device', () => ({ clearDeviceCache: vi.fn(), closeDeviceDb: vi.fn(), finalDeviceSync: vi.fn() }));
async function render(status: 'pending' | 'rejected') {
  return new Response(await renderToReadableStream(createElement(LocaleProvider, { locale: state.locale }, await PendingIntake({ status })))).text();
}
it.each(['ar', 'en'] as const)('shows intake only before submission and sign-out after submission in %s', async locale => {
  state.locale = locale; state.intake = null; state.error = null;
  expect(await render('pending')).toContain('<form');
  state.intake = { current_tool: 'other_app' };
  const pending = await render('pending');
  expect(pending).toContain('glass-strong');
  expect(pending).toContain('<header');
  expect(pending).not.toContain('animate-pulse');
  expect(pending).not.toContain('<form');
  expect(pending).toContain(locale === 'en' ? 'Sign out' : 'تسجيل الخروج');
  expect(await render('rejected')).not.toContain('<form');
});
it('shows a retry instead of a fresh intake form when the read fails', async () => {
  state.locale = 'en'; state.intake = null; state.error = 'Read failed';
  const html = await render('pending');
  expect(html).toContain('role="alert"');
  expect(html).toContain('Try again');
  expect(html).not.toContain('<form');
});
it('offers sign-out before the captain submits intake', async () => {
  state.locale = 'en'; state.intake = null; state.error = null;
  expect(await render('pending')).toContain('Sign out');
});
it.each(['ar', 'en'] as const)('offers the demo, the review time and WhatsApp while pending in %s', async locale => {
  state.locale = locale; state.intake = { current_tool: 'other_app' }; state.error = null;
  const pending = await render('pending');
  expect(pending).toContain('href="/demo"');
  expect(pending).toContain(locale === 'ar' ? '24 ساعة' : '24 hours');
  expect(pending).toContain('wa.me');
  expect(await render('rejected')).not.toContain('href="/demo"');
});
