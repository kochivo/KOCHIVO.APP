import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { formatDateAr } from '@/lib/dates';

const features = join(process.cwd(), 'src/features');

// One digit style across the Arabic UI: copy, dates and gym numbers all use Latin digits.
it('keeps Arabic copy and dates on Latin digits', () => {
  const offenders = readdirSync(features).flatMap((feature) => {
    try { return /[٠-٩]/.test(readFileSync(join(features, feature, 'messages.ts'), 'utf8')) ? [feature] : []; }
    catch { return []; }
  });
  expect(offenders).toEqual([]);
  expect(formatDateAr('2026-11-03', { day: 'numeric', month: 'long', year: 'numeric' })).toBe('3 نوفمبر 2026');
});
