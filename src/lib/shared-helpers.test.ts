import { describe, expect, it } from 'vitest';
import { formatDateAr, formatTimestampAr, saturdayWeek } from './dates';
import { formatNumber } from './format';
import { whatsappUrl } from './whatsapp';

describe('Saturday calendar week', () => {
  it.each(['2026-12-26', '2027-01-01'])('includes %s across the year boundary', today => {
    expect(saturdayWeek(today)).toEqual([
      '2026-12-26', '2026-12-27', '2026-12-28', '2026-12-29',
      '2026-12-30', '2026-12-31', '2027-01-01',
    ]);
  });
  it('includes leap day', () => {
    expect(saturdayWeek('2028-02-29')).toEqual([
      '2028-02-26', '2028-02-27', '2028-02-28', '2028-02-29',
      '2028-03-01', '2028-03-02', '2028-03-03',
    ]);
  });
});

describe('Arabic displays', () => {
  it('preserves each date-only display style', () => {
    expect(formatDateAr('2026-11-03', { day: 'numeric', month: 'long' })).toBe('٣ نوفمبر');
    expect(formatDateAr('2026-11-03', { day: 'numeric', month: 'long', year: 'numeric' })).toBe('٣ نوفمبر ٢٠٢٦');
    expect(formatDateAr('2026-11-03', { weekday: 'short' })).toBe('الثلاثاء');
    expect(formatDateAr('2026-11-03', { weekday: 'short', day: 'numeric', month: 'short' })).toBe('الثلاثاء، ٣ نوفمبر');
  });
  it('converts timestamps across Cairo midnight and summer time', () => {
    expect(formatTimestampAr('2026-11-02T23:30:00Z', { day: 'numeric', month: 'short', year: 'numeric' })).toBe('٣ نوفمبر ٢٠٢٦');
    expect(formatTimestampAr('2026-07-01T21:30:00Z', { day: 'numeric', month: 'long', year: 'numeric' })).toBe('٢ يوليو ٢٠٢٦');
  });
  it('keeps Latin digits, grouping and decimal rounding', () => {
    expect(formatNumber(12345.6789)).toBe('12,345.679');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1234.5)).toBe('-1,234.5');
  });
});

describe('WhatsApp links', () => {
  it('sanitizes phones and encodes message punctuation', () => {
    expect(whatsappUrl({ phone: '+20 (100) 123-4567' })).toBe('https://wa.me/201001234567');
    expect(whatsappUrl({ phone: '+20', text: 'أ & ؟' })).toBe('https://wa.me/20?text=%D8%A3%20%26%20%D8%9F');
  });
  it.each(['', ' +()- ', 'abc'])('rejects a supplied phone without digits: %s', phone => {
    expect(whatsappUrl({ phone, text: 'hello' })).toBeNull();
  });
  it('shares without a phone and supports an empty message', () => {
    expect(whatsappUrl({ text: 'a & b' })).toBe('https://wa.me/?text=a%20%26%20b');
    expect(whatsappUrl({})).toBe('https://wa.me/?text=');
    expect(whatsappUrl({ phone: '20', text: '' })).toBe('https://wa.me/20?text=');
  });
});
