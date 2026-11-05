import { describe, expect, it } from 'vitest';
import { installPlatform } from './platform';
import { shouldShowInstall } from './policy';

describe('installPlatform', () => {
  it.each([[0, 'unsupported'], [1, 'unsupported'], [5, 'ios']] as const)('detects Macintosh with %s touch points', (maxTouchPoints, expected) => {
    expect(installPlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      maxTouchPoints, standalone: false, hasPromptEvent: false })).toBe(expected);
    expect(installPlatform({ userAgent: 'Macintosh', maxTouchPoints,
      standalone: true, hasPromptEvent: true })).toBe('installed');
  });
  it.each([
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130.0', false, true, 'android'],
    ['Mozilla/5.0 (iPhone) AppleWebKit/605.1 Safari/604.1', false, false, 'ios'],
    ['Mozilla/5.0 (iPhone) AppleWebKit/605.1 CriOS/130.0', false, true, 'ios'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', false, true, 'android'],
    ['Mozilla/5.0 (iPhone) Safari/604.1', true, true, 'installed'],
    ['Mozilla/5.0 (Windows NT 10.0) Firefox/130.0', false, false, 'unsupported'],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130.0', false, false, 'unsupported'],
  ] as const)('%s standalone=%s prompt=%s → %s', (userAgent, standalone, hasPromptEvent, expected) => {
    expect(installPlatform({ userAgent, standalone, hasPromptEvent })).toBe(expected);
  });
});

describe('shouldShowInstall', () => {
  const now = 1_800_000_000_000;
  const week = 7 * 24 * 60 * 60 * 1000;
  const eligible = { finishedWorkouts: 1, platform: 'android' as const,
    dismissals: 0, lastDismissedAt: null, now };

  it('shows after the first completed workout', () => {
    expect(shouldShowInstall(eligible)).toBe(true);
    expect(shouldShowInstall({ ...eligible, finishedWorkouts: 2, platform: 'ios' })).toBe(true);
  });
  it('never shows before a completed workout', () => {
    expect(shouldShowInstall({ ...eligible, finishedWorkouts: 0 })).toBe(false);
  });
  it('allows captains without workouts and keeps the same dismissal rules', () => {
    const captain = { ...eligible, role: 'captain' as const, finishedWorkouts: 0 };
    expect(shouldShowInstall(captain)).toBe(true);
    expect(shouldShowInstall({ ...captain, dismissals: 3 })).toBe(false);
    expect(shouldShowInstall({ ...captain, lastDismissedAt: now - week + 1 })).toBe(false);
    expect(shouldShowInstall({ ...captain, lastDismissedAt: now - week })).toBe(true);
    expect(shouldShowInstall({ ...captain, platform: 'installed' })).toBe(false);
    expect(shouldShowInstall({ ...captain, platform: 'unsupported' })).toBe(false);
  });
  it.each(['installed', 'unsupported'] as const)('never shows on %s', (platform) => {
    expect(shouldShowInstall({ ...eligible, platform })).toBe(false);
  });
  it('stops permanently at three dismissals', () => {
    expect(shouldShowInstall({ ...eligible, dismissals: 2 })).toBe(true);
    expect(shouldShowInstall({ ...eligible, dismissals: 3 })).toBe(false);
    expect(shouldShowInstall({ ...eligible, dismissals: 4 })).toBe(false);
  });
  it('waits a full seven days including the exact boundary', () => {
    expect(shouldShowInstall({ ...eligible, lastDismissedAt: now - week + 1 })).toBe(false);
    expect(shouldShowInstall({ ...eligible, lastDismissedAt: now - week })).toBe(true);
    expect(shouldShowInstall({ ...eligible, lastDismissedAt: now + 1 })).toBe(false);
  });
});
