import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, intlLocale, localeDir, parseLocale } from './locale';
import { createT, defineMessages } from './messages';
import { formatDateAr, formatTimestampAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';

vi.mock('server-only', () => ({}));
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => jar }));

describe('locale foundation', () => {
  it('formats English dates while preserving Arabic defaults and stable log dates', () => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' } as const;
    expect(formatDateAr('2026-11-03', options)).toBe('٣ نوفمبر ٢٠٢٦');
    expect(formatDateAr('2026-11-03', options, 'en')).toBe('3 November 2026');
    expect(formatTimestampAr('2026-11-02T23:30:00Z', options, 'en')).toBe('3 November 2026');
    expect(localDate(new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03');
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(-1234.5)).toBe('-1,234.5');
    expect(formatNumber(1234, 'en')).toBe('1,234');
  });
  it('accepts only supported cookie values, defaulting to Arabic', () => {
    expect(LOCALES).toEqual(['ar', 'en']);
    expect(DEFAULT_LOCALE).toBe('ar');
    expect(parseLocale('en')).toBe('en');
    for (const value of [undefined, null, '', 'EN', 'fr', {}, 'ar-EG']) expect(parseLocale(value)).toBe('ar');
    expect(parseLocale('ar')).toBe('ar');
  });
  it('maps direction and regional Intl locales', () => {
    expect(localeDir('ar')).toBe('rtl');
    expect(localeDir('en')).toBe('ltr');
    expect(intlLocale('ar')).toBe('ar-EG');
    expect(intlLocale('en')).toBe('en-GB');
  });
  it('interpolates variables literally and selects locale plural categories', () => {
    const messages = defineMessages({
      ar: { hello: 'أهلاً {name}', 'players.one': 'لاعب', 'players.few': '{n} لاعبين', 'players.many': '{n} لاعب', 'players.other': '{n} لاعب' },
      en: { hello: 'Hello {name}', 'players.one': 'One player', 'players.other': '{n} players' },
    });
    expect(createT(messages, 'en')('hello', { name: '$&' })).toBe('Hello $&');
    expect(createT(messages, 'ar')('players', { n: 3 })).toBe('3 لاعبين');
    expect(createT(messages, 'ar')('players', { n: 11 })).toBe('11 لاعب');
    expect(createT(messages, 'ar')('players', { n: 0 })).toBe('0 لاعب');
    expect(createT(messages, 'en')('players', { n: 1 })).toBe('One player');
    expect(createT(messages, 'en')('players', { n: 3 })).toBe('3 players');
    // @ts-expect-error English must include every non-plural Arabic key.
    defineMessages({ ar: { required: 'مطلوب' }, en: {} });
    // @ts-expect-error English cannot introduce extra keys.
    defineMessages({ ar: { required: 'مطلوب' }, en: { required: 'Required', extra: 'Extra' } });
  });
  it('reads only the cookie and validates writes before storing them', async () => {
    const { getLocale, getT } = await import('./server');
    const { setLocale } = await import('./set-locale');
    jar.get.mockReturnValue(undefined);
    expect(await getLocale()).toBe('ar');
    jar.get.mockReturnValue({ value: 'en' });
    expect(await getLocale()).toBe('en');
    const t = await getT(defineMessages({ ar: { hello: 'أهلاً' }, en: { hello: 'Hello' } }));
    expect(t('hello')).toBe('Hello');
    await expect(setLocale('fr')).rejects.toThrow();
    expect(jar.set).not.toHaveBeenCalled();
    expect(await setLocale('en')).toBeUndefined();
    expect(jar.set).toHaveBeenCalledWith('kochivo.locale', 'en', expect.objectContaining({ maxAge: 31536000, sameSite: 'lax', path: '/' }));
  });
});
