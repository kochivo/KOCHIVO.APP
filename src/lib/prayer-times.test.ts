import { expect, it } from 'vitest';
import { defaultCityForTimezone, PRAYER_CITIES, sunsetAndFajr } from './prayer-times';

it('calculates Cairo sunset locally without a network or dependency', () => {
  // Reference: Egyptian Survey Authority Cairo timetable, Ramadan 1445 (EET):
  // March 11 maghrib 18:00; April 9 maghrib 18:19.
  for (const [date, expected] of [['2024-03-11', '16:00'], ['2024-04-09', '16:19']] as const) {
    const city = defaultCityForTimezone('Africa/Cairo');
    const result = sunsetAndFajr(date, city);
    expect(Math.abs(result.maghrib.getTime() - Date.parse(`${date}T${expected}:00Z`))).toBeLessThanOrEqual(180000);
    expect(result.fajr.getTime()).toBeLessThan(result.maghrib.getTime());
  }
});
it('includes every Egyptian capital and derives cities from timezones', () => {
  expect(PRAYER_CITIES).toHaveLength(34);
  expect(defaultCityForTimezone('Asia/Riyadh').code).toBe('riyadh');
  expect(defaultCityForTimezone('unknown').code).toBe('cairo');
});
