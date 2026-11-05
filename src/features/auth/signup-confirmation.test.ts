import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleAuthCallback } from './data/callback';

const { verifyOtp, profile } = vi.hoisted(() => ({
  verifyOtp: vi.fn().mockResolvedValue({ error: null }),
  profile: vi.fn().mockResolvedValue({ role: 'captain', roleConfirmed: true }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, delete: vi.fn() }), headers: async () => new Headers() }));
vi.mock('./data/auth-client', () => ({
  siteOrigin: async () => 'http://localhost:3000',
  authClient: async () => ({ auth: { verifyOtp } }),
  profile,
}));

it('confirms signup on another device without a PKCE exchange', async () => {
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?token_hash=signup-hash&type=signup'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/captain');
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'signup-hash', type: 'signup' });
});

it('rejects an expired signup hash before looking up or changing the profile', async () => {
  profile.mockClear();
  verifyOtp.mockResolvedValueOnce({ error: { code: 'otp_expired' } });
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/callback?token_hash=expired&type=signup'));
  expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/login');
  expect(profile).not.toHaveBeenCalled();
});

it('accepts an email hash without a PKCE exchange', async () => {
  const response = await handleAuthCallback(new NextRequest('http://localhost:3000/auth/confirm?token_hash=email-hash&type=email'));
  expect(response.headers.get('location')).toBe('http://localhost:3000/captain');
  expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'email-hash', type: 'email' });
});

it('exposes the callback handler at both confirmation routes', async () => {
  const callback = await import('@/app/[locale]/auth/callback/route');
  const confirm = await import('@/app/[locale]/auth/confirm/route');
  expect(confirm.GET).toBe(callback.GET);
});
