import { expect, it, vi } from 'vitest';
import { AuthApiError } from '@supabase/supabase-js';
import { authError } from './errors';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { authSchemas } from './schemas';

it.each([
  new AuthApiError('private user@example.com', 500, 'server_error'),
  new AuthApiError('private user@example.com', 400, 'unexpected_failure'),
  new AuthApiError('SMTP user@example.com', 400, undefined),
  new AuthApiError('Error sending email to user@example.com', 400, undefined),
])('reports a sanitized provider failure', error => {
  const report = vi.fn();
  expect(authError(error, 'en', { sendsEmail: true, report })).toBe(messages.en.emailProviderFailed);
  expect(report).toHaveBeenCalledExactlyOnceWith(new Error('Auth email send failed'), {
    tags: { area: 'auth-email', code: error.code ?? '', status: String(error.status) },
  });
  expect(JSON.stringify(report.mock.calls)).not.toContain('user@example.com');
});

it('does not report rate limits or unrelated errors', () => {
  const report = vi.fn();
  expect(authError(new AuthApiError('SMTP user@example.com', 500, 'over_email_send_rate_limit'), 'en', { sendsEmail: true, report }))
    .toBe(messages.en.emailRateLimited);
  expect(authError(new Error('SMTP'), 'en', { sendsEmail: true, report })).toBe(messages.en.somethingWentWrongTryAgain);
  expect(authError(new AuthApiError('private', 400, 'invalid_credentials'), 'en', { sendsEmail: true, report }))
    .toBe(messages.en.emailOrPasswordIsIncorrect);
  expect(report).not.toHaveBeenCalled();
});

it.each([500, 400])('keeps non-email failures generic for status %s', status => {
  const report = vi.fn();
  const error = new AuthApiError('SMTP private@example.com', status, 'unexpected_failure');
  expect(authError(error, 'en', { report })).toBe(messages.en.somethingWentWrongTryAgain);
  expect(authError(error, 'en', { sendsEmail: false, report })).toBe(messages.en.somethingWentWrongTryAgain);
  expect(authError(new AuthApiError('private', 429, 'over_email_send_rate_limit'), 'en', { report }))
    .toBe(messages.en.emailRateLimited);
  expect(report).not.toHaveBeenCalled();
});

it('translates domain and validation errors in English', () => {
  expect(authError({ code: 'invalid_credentials' }, 'en')).toBe('Email or password is incorrect');
  const result = authSchemas(createT(messages, 'en')).emailSchema.safeParse({ email: 'invalid' });
  expect(result.error?.issues[0]?.message).toBe('Enter a valid email');
});

it.each([
  [{ code: 42501 }, 'الحساب ده مش مسموح له بالخطوة دي'],
  [{ code: 'P0002' }, 'الدعوة مش صالحة أو انتهت'],
  [{ code: 'PGRST116' }, 'حصلت مشكلة، جرّب تاني'],
  [{ code: '22023' }, 'حصلت مشكلة، جرّب تاني'],
  [Object.assign(new Error('private'), { code: '23505' }), 'حسابك مربوط بكابتن بالفعل'],
  [null, 'حصلت مشكلة، جرّب تاني'],
  ['42501', 'حصلت مشكلة، جرّب تاني'],
])('preserves auth code coercion and domain messages for %s', (error, message) => {
  expect(authError(error)).toBe(message);
});
