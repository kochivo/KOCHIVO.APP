import type * as ReactModule from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Locale } from './locale';

const request = vi.hoisted(() => ({ locale: {} as { value?: Locale }, cookies: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(), cache: () => () => request.locale }));
vi.mock('next/headers', () => ({ cookies: request.cookies }));
beforeEach(() => { request.locale = {}; vi.clearAllMocks(); });

it('uses route params without reading cookies during static rendering', async () => {
  const { getLocale, getT, setRequestLocale } = await import('./server');
  setRequestLocale('en');
  expect(await getLocale()).toBe('en');
  const t = await getT({ ar: { hello: 'أهلاً' }, en: { hello: 'Hello' } });
  expect(t('hello')).toBe('Hello');
  expect(request.cookies).not.toHaveBeenCalled();
});

it('reads cookies for actions without a seeded render locale', async () => {
  const { getLocale } = await import('./server');
  request.cookies.mockResolvedValue({ get: () => ({ value: 'en' }) });
  expect(await getLocale()).toBe('en');
  expect(request.cookies).toHaveBeenCalledOnce();
});

it('accepts an explicit page locale without consulting request state or cookies', async () => {
  const { getT } = await import('./server');
  const t = await getT({ ar: { hello: 'أهلاً' }, en: { hello: 'Hello' } }, 'en');
  expect(t('hello')).toBe('Hello');
  expect(request.cookies).not.toHaveBeenCalled();
});
