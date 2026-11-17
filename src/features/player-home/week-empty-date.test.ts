import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildWeek } from './week';

describe('home week strip before the date is known', () => {
  it('buildWeek cannot take an empty date, so the home screen must not call it while loading', () => {
    expect(() => buildWeek('', [], [])).toThrow();
    const source = readFileSync(new URL('./components/home-screen.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/const weekStrip = today && <WeekStrip/);
  });
});
