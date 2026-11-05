import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { CaptainPendingScreen } from './components/captain-pending-screen';
import { messages } from './messages';

const state = vi.hoisted(() => ({ locale: 'en' as 'ar' | 'en' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => state.locale, getT: async () => createT(messages, state.locale) }));
vi.mock('@/features/notifications', () => ({ PushToggleCard: () => createElement('div', { 'data-push': true }) }));
vi.mock('@/features/auth', async () => ({ SignOutButton: (await import('../auth/components/sign-out-button')).SignOutButton }));
vi.mock('../auth/data/sign-out', () => ({ signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace() {} }) }));
it.each(['ar', 'en'] as const)('renders pending and rejected states with sign-out and push in %s', async locale => {
  state.locale = locale;
  const render = async (status: 'pending' | 'rejected') => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    await CaptainPendingScreen({ status })));
  expect(await render('pending')).toContain(locale === 'en' ? 'Your account is under review' : 'حسابك تحت المراجعة');
  expect(await render('rejected')).toContain(locale === 'en' ? 'your request wasn&#x27;t accepted' : 'للأسف طلبك ماتقبلش');
  for (const status of ['pending', 'rejected'] as const) {
    expect(await render(status)).toContain('data-push');
    expect(await render(status)).toContain(locale === 'en' ? 'Sign out' : 'تسجيل الخروج');
  }
  expect(await render('rejected')).toContain('https://wa.me/');
});
