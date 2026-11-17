import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('./data/sign-up-captain', () => ({ signUpCaptain: vi.fn() }));
vi.mock('./components/login-methods', () => ({ LoginMethods: () => null }));
vi.mock('./components/google-button', () => ({ GoogleButton: () => null }));
vi.mock('./components/signup-code-step', () => ({ SignupCodeStep: () => null }));
import { CaptainAuthCard } from './components/captain-auth-card';

it.each(['ar', 'en'] as const)('links the login logo to the %s home page with a named 48px target', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(CaptainAuthCard)));
  const logo = html.match(/<a\b[^>]*><div[^>]*><img[^]*?<\/a>/)?.[0] ?? '';
  expect(logo).toContain(`href="/${locale}"`);
  expect(logo).toContain('aria-label="KOCHIVO"');
  expect(logo).toContain('min-h-12');
  expect(logo).toContain('logo-primary.png');
});
