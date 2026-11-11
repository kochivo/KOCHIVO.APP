import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { authError } from './errors';
import { messages } from './messages';
import { callAuthAction } from './data/client-action';

afterEach(() => vi.unstubAllEnvs());
it('uses the selected translator for invalid credentials and client failures', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const t = createT(messages, 'ar', 'standard');
  expect(authError({ code: 'invalid_credentials' }, t)).toBe('البريد الإلكتروني أو كلمة السر غير صحيحة');
  expect(await callAuthAction(async () => { throw new Error('offline'); }, 'ar', t))
    .toEqual({ error: 'حدثت مشكلة، حاول مجدداً' });
});
