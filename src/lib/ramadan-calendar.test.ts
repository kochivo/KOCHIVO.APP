import { expect, it } from 'vitest';
import { ramadanDay, ramadanRange, ramadanSettingsVisible } from './ramadan-calendar';

it('activates only within the published Ramadan window, including both boundaries', () => {
  expect(ramadanDay('2027-02-07')).toBeNull();
  expect(ramadanDay('2027-02-08')).toBe(1);
  expect(ramadanDay('2027-03-09')).toBe(30);
  expect(ramadanDay('2027-03-10')).toBeNull();
  expect(ramadanDay('2031-02-01')).toBeNull();
  expect(ramadanRange(2030)).toEqual({ start: '2030-01-05', end: '2030-02-03' });
});
it.each([
  ['2027-01-24', false], ['2027-01-25', true], ['2027-03-09', true], ['2027-03-10', false],
  ['2029-12-21', false], ['2029-12-22', true], ['2030-02-03', true], ['2030-02-04', false],
  ['2031-01-01', false],
])('shows captain settings only within the seasonal window on %s', (date, expected) => {
  expect(ramadanSettingsVisible(date)).toBe(expected);
});
