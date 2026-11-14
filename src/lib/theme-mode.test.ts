import { describe, expect, it } from 'vitest';
import { themeMode } from './theme-mode';

describe('themeMode', () => {
  it.each(['/captain', '/captain/players/id', '/ar/captain', '/en/captain/settings'])('forces dark on workspace route %s', pathname => {
    expect(themeMode({ stored: 'light', prefersDark: false, pathname, workspace: true })).toBe('dark');
    expect(themeMode({ stored: 'light', prefersDark: false, pathname, workspace: false })).toBe('light');
  });
  it.each(['/ar/player', '/en', '/c/captain', '/captain-other'])('preserves the device on %s', pathname => {
    expect(themeMode({ prefersDark: false, pathname, workspace: true })).toBe('light');
  });
  it.each([true, false])('honors explicit choices with prefersDark=%s', prefersDark => {
    expect(themeMode({ stored: 'light', prefersDark })).toBe('light');
    expect(themeMode({ stored: 'dark', prefersDark })).toBe('dark');
  });
  it.each(['system', 'junk', null, undefined])('follows the device for %s', stored => {
    expect(themeMode({ stored, prefersDark: true })).toBe('dark');
    expect(themeMode({ stored, prefersDark: false })).toBe('light');
  });
});
