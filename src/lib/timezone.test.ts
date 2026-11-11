import { describe, expect, it, vi, afterEach } from 'vitest';
import { localDate, DEFAULT_TIMEZONE } from './dates';
import { deviceTimezone, isValidTimezone, profileTimezone, timezoneSyncTarget } from './timezone';

afterEach(() => vi.unstubAllEnvs());
describe('user timezone', () => {
  it('validates unknown and missing zones safely', () => {
    expect(isValidTimezone('Asia/Riyadh')).toBe(true);
    for (const zone of ['', 'unknown/place', undefined, null]) expect(isValidTimezone(zone)).toBe(false);
    expect(localDate(new Date('2026-01-01T22:30:00Z'), 'unknown/place')).toBe('2026-01-02');
  });
  it('detects the device with a safe fallback', () => {
    expect(deviceTimezone(() => 'Asia/Dubai')).toBe('Asia/Dubai');
    expect(deviceTimezone(() => 'unknown/place')).toBe(DEFAULT_TIMEZONE);
    expect(deviceTimezone(() => { throw new Error('unavailable'); })).toBe(DEFAULT_TIMEZONE);
  });
  it('keeps flag-off dates byte-identical to the Cairo formatter', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
    const at = new Date('2026-01-01T22:30:00Z');
    const legacy = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
    expect(localDate(at, profileTimezone('America/New_York'))).toBe(legacy);
    expect(timezoneSyncTarget(true, DEFAULT_TIMEZONE, 'Asia/Dubai')).toBeNull();
  });
  it.each([
    ['Africa/Cairo', '2026-01-01T22:30:00Z', '2026-01-02'],
    ['Asia/Riyadh', '2026-01-01T21:30:00Z', '2026-01-02'],
    ['Asia/Dubai', '2026-01-01T20:30:00Z', '2026-01-02'],
    ['Europe/London', '2026-07-01T23:30:00Z', '2026-07-02'],
    ['Europe/London', '2026-01-01T23:30:00Z', '2026-01-01'],
    ['America/New_York', '2026-01-02T04:30:00Z', '2026-01-01'],
    ['Pacific/Auckland', '2026-01-01T11:30:00Z', '2026-01-02'],
  ])('computes %s day at %s', (zone, now, expected) => {
    expect(localDate(new Date(now), zone)).toBe(expected);
  });
  it('keeps captain and player days distinct around midnight', () => {
    const now = new Date('2026-01-01T21:30:00Z');
    expect(localDate(now, 'Asia/Dubai')).toBe('2026-01-02');
    expect(localDate(now, 'America/New_York')).toBe('2026-01-01');
  });
  it('never overwrites manual mode or loops after a successful sync', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    expect(timezoneSyncTarget(false, DEFAULT_TIMEZONE, 'Asia/Dubai')).toBeNull();
    expect(timezoneSyncTarget(true, DEFAULT_TIMEZONE, 'Asia/Dubai')).toBe('Asia/Dubai');
    expect(timezoneSyncTarget(true, 'Asia/Dubai', 'Asia/Dubai')).toBeNull();
    expect(timezoneSyncTarget(true, DEFAULT_TIMEZONE, 'bad')).toBeNull();
    expect(profileTimezone('bad')).toBe(DEFAULT_TIMEZONE);
    expect(profileTimezone(null)).toBe(DEFAULT_TIMEZONE);
  });
});
