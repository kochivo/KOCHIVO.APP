import { beforeEach, expect, it, vi } from 'vitest';
import { AuthApiError } from '@supabase/supabase-js';
import { runAction } from './auth-client';
import { messages } from '../messages';
import { signInPassword } from './sign-in-password';
import { sendEmailCode } from './send-email-code';
import { sendSignInEmailCode } from './sign-in-email-code';
import { requestReset } from './request-reset';
import { signUpCaptain, resendCaptainCode } from './sign-up-captain';
import { signUpPlayer } from './sign-up-player';

const { capture, config, signIn, send, signUp, reset, resend } = vi.hoisted(() => ({
  capture: vi.fn(), config: { sentryDsn: 'configured' }, signIn: vi.fn(), send: vi.fn(),
  signUp: vi.fn(), reset: vi.fn(), resend: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
vi.mock('@/lib/public-config', () => ({ publicConfig: config }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'localhost:3000' }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { signInWithPassword: signIn, signInWithOtp: send, signUp, resetPasswordForEmail: reset, resend,
    getUser: async () => ({ data: { user: null } }) },
  rpc: async () => ({ data: [{}] }),
}) }));
vi.mock('@/core/i18n/server', async () => {
  const { createT } = await import('@/core/i18n/messages');
  const { messages } = await import('../messages');
  return { getT: async () => createT(messages, 'en') };
});

beforeEach(() => { capture.mockClear(); config.sentryDsn = 'configured'; });
const fail = (code = 'unexpected_failure') => runAction(async () => {
  throw new AuthApiError('SMTP failed for private@example.com', 500, code);
}, { sendsEmail: true });

it('reports a fixed error and metadata from the server action boundary', async () => {
  expect(await fail()).toEqual({ error: messages.en.emailProviderFailed });
  expect(capture).toHaveBeenCalledExactlyOnceWith(new Error('Auth email send failed'), {
    tags: { area: 'auth-email', code: 'unexpected_failure', status: '500' },
  });
  expect(JSON.stringify(capture.mock.calls)).not.toContain('private@example.com');
});

it('respects the Sentry flag and suppresses rate-limit reporting', async () => {
  expect(await fail('over_email_send_rate_limit')).toEqual({ error: messages.en.emailRateLimited });
  expect(capture).not.toHaveBeenCalled();
  config.sentryDsn = '';
  expect(await fail()).toEqual({ error: messages.en.emailProviderFailed });
  expect(capture).not.toHaveBeenCalled();
});

it('classifies email sends but keeps password sign-in outages generic', async () => {
  const error = new AuthApiError('private@example.com', 500, 'unexpected_failure');
  send.mockResolvedValue({ error });
  signIn.mockResolvedValue({ error });
  expect(await sendEmailCode({ email: 'private@example.com' })).toEqual({ error: messages.en.emailProviderFailed });
  expect(capture).toHaveBeenCalledOnce();
  capture.mockClear();
  expect(await signInPassword({ email: 'private@example.com', password: 'password123' }))
    .toEqual({ error: messages.en.somethingWentWrongTryAgain });
  expect(capture).not.toHaveBeenCalled();
});

it('opts in reset, resend, sign-in code, and confirmation signup failures', async () => {
  const error = new AuthApiError('private@example.com', 500, 'unexpected_failure');
  for (const mock of [send, signUp, reset, resend]) mock.mockResolvedValue({ error });
  const input = { email: 'private@example.com', password: 'password123', full_name: 'Player' };
  for (const action of [() => requestReset(input), () => resendCaptainCode(input),
    () => sendSignInEmailCode(input), () => signUpCaptain(input), () => signUpPlayer(input, 'coach')]) {
    capture.mockClear();
    expect(await action()).toEqual({ error: messages.en.emailProviderFailed });
    expect(capture).toHaveBeenCalledOnce();
  }
  capture.mockClear();
  signIn.mockResolvedValue({ error });
  expect(await signUpPlayer(input, 'coach', true)).toEqual({ error: messages.en.somethingWentWrongTryAgain });
  expect(capture).not.toHaveBeenCalled();
});
