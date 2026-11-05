import { expect, it } from 'vitest';
import { authError } from './errors';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { authSchemas } from './schemas';

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
