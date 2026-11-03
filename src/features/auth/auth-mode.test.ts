import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { authMode } from './auth-mode';
import { CaptainAuthCard } from './components/captain-auth-card';

vi.mock('./data/sign-in-password', () => ({ signInPassword: vi.fn() }));
vi.mock('./data/sign-up-captain', () => ({ signUpCaptain: vi.fn() }));
vi.mock('./data/sign-in-google', () => ({ signInGoogle: vi.fn() }));

it('opens signup only for the exact signup tab', () => {
  expect(authMode('signup')).toBe('signup');
  expect(authMode(undefined)).toBe('login');
  expect(authMode(['signup'])).toBe('login');
  expect(authMode('other')).toBe('login');
});

it('renders the signup form when asked to start there', () => {
  const signup = renderToStaticMarkup(createElement(CaptainAuthCard, { initialMode: 'signup' }));
  expect(signup).toContain('اعمل حسابك كابتن');
  expect(signup).toContain('name="full_name"');
  const login = renderToStaticMarkup(createElement(CaptainAuthCard, {}));
  expect(login).toContain('أهلاً يا كابتن');
  expect(login).not.toContain('name="full_name"');
});
