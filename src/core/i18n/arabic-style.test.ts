import { afterEach, describe, expect, it, vi } from 'vitest';
import { createT, defineMessages } from './messages';
import { resolveArabicStyle } from './locale';

afterEach(() => vi.unstubAllEnvs());
describe('Arabic styles', () => {
  it('selects standard strings, interpolates and falls back per plural key', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    const messages = defineMessages({
      ar: { hello: 'أهلاً {name}', fallback: 'مصري', 'sets.few': '{n} سِت', 'sets.other': '{n} سِت' },
      en: { hello: 'Hello {name}', fallback: 'Fallback', 'sets.other': '{n} sets' },
      arStd: { hello: 'مرحباً {name}', 'sets.few': '{n} مجموعات' },
    });
    const t = createT(messages, 'ar', 'standard');
    expect(t('hello', { name: '$&' })).toBe('مرحباً $&');
    expect(t('fallback')).toBe('مصري');
    expect(t('sets', { n: 3 })).toBe('3 مجموعات');
    expect(t('sets', { n: 11 })).toBe('11 سِت');
    expect(createT(messages, 'ar')('hello')).toBe('أهلاً {name}');
    expect(createT(messages, 'en', 'standard')('hello')).toBe('Hello {name}');
  });
  it('keeps Egyptian output with the flag off', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
    const m = defineMessages({ ar: { now: 'دلوقتي' }, en: { now: 'Now' }, arStd: { now: 'الآن' } });
    expect(createT(m, 'ar', 'standard')('now')).toBe('دلوقتي');
    expect(resolveArabicStyle({ cookie: 'standard' })).toBe('egyptian');
  });
  it('uses all six Arabic plural categories in the standard dictionary', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    const messages = defineMessages({
      ar: { 'sets.zero': 'مفيش', 'sets.one': 'سِت واحد', 'sets.two': 'سِتين', 'sets.few': '{n} سِتات', 'sets.many': '{n} سِت', 'sets.other': '{n} سِت' },
      en: { 'sets.one': 'One set', 'sets.other': '{n} sets' },
      arStd: { 'sets.zero': 'لا توجد مجموعات', 'sets.one': 'مجموعة واحدة', 'sets.two': 'مجموعتان', 'sets.few': '{n} مجموعات', 'sets.many': '{n} مجموعة', 'sets.other': '{n} مجموعة' },
    });
    const t = createT(messages, 'ar', 'standard');
    for (const [n, expected] of [[0, 'لا توجد مجموعات'], [1, 'مجموعة واحدة'], [2, 'مجموعتان'], [3, '3 مجموعات'], [11, '11 مجموعة'], [100, '100 مجموعة']] as const) {
      expect(t('sets', { n })).toBe(expected);
    }
  });
  it('rejects unknown keys and placeholder drift at compile time', () => {
    // @ts-expect-error Standard Arabic cannot introduce a key.
    defineMessages({ ar: { now: 'الآن' }, en: { now: 'Now' }, arStd: { extra: 'زائد' } });
    // @ts-expect-error Standard Arabic must preserve every placeholder.
    defineMessages({ ar: { hi: 'أهلاً {name}' }, en: { hi: 'Hi {name}' }, arStd: { hi: 'مرحباً' } });
    // @ts-expect-error Standard Arabic cannot add a placeholder.
    defineMessages({ ar: { hi: 'أهلاً' }, en: { hi: 'Hi' }, arStd: { hi: 'مرحباً {name}' } });
  });
  it('prioritizes manual choices before profile and device defaults', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    expect(resolveArabicStyle({ cookie: 'standard', profile: 'egyptian', profileTimezone: 'Africa/Cairo' })).toBe('standard');
    expect(resolveArabicStyle({ profile: 'egyptian', deviceTimezone: 'Asia/Riyadh' })).toBe('egyptian');
    for (const options of [{ profileTimezone: 'Africa/Cairo' }, { deviceTimezone: 'Africa/Cairo' }, { language: 'ar-EG' }]) {
      expect(resolveArabicStyle(options)).toBe('egyptian');
    }
    expect(resolveArabicStyle({ deviceTimezone: 'Asia/Riyadh', language: 'ar-SA' })).toBe('standard');
    expect(resolveArabicStyle({ cookie: 'invalid' })).toBe('standard');
  });
});
