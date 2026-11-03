import { describe, expect, it } from 'vitest';
import { nextVisibleStep, tourKey, tourDue, rememberTour } from './tour/state';

describe('tour navigation', () => {
  const steps = [{ target: 'home' }, { target: 'missing' }, { target: 'inbox' }];
  const visible = (id: string) => id !== 'missing';
  it('skips missing or hidden targets in both directions', () => {
    expect(nextVisibleStep(steps, -1, 1, visible)).toBe(0);
    expect(nextVisibleStep(steps, 0, 1, visible)).toBe(2);
    expect(nextVisibleStep(steps, 2, -1, visible)).toBe(0);
    expect(nextVisibleStep(steps, 2, 1, visible)).toBeNull();
    expect(nextVisibleStep(steps, 0, -1, visible)).toBeNull();
    expect(nextVisibleStep(steps, -1, 1, () => false)).toBeNull();
  });
});

describe('tour persistence', () => {
  it('suppresses a finished or skipped tour for this user only', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(tourDue(storage, 'ali', null, false)).toBe(true);
    rememberTour(storage, 'ali', '2026-11-03T10:00:00Z');
    expect(storage.getItem(tourKey('ali'))).toBe('2026-11-03T10:00:00Z');
    expect(tourDue(storage, 'ali', null, false)).toBe(false);
    expect(tourDue(storage, 'other', null, false)).toBe(true);
    expect(tourDue(storage, 'other', '2026-11-03T10:00:00Z', false)).toBe(false);
    expect(tourDue(storage, 'other', null, true)).toBe(false);
  });
});
