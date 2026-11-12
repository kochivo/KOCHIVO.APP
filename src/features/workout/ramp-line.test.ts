import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { SnapshotDay } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { RampLine } from './components/ramp-line';

vi.mock('server-only', () => ({}));
const stored = vi.hoisted(() => ({ bodyweight: [] as string[] }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => stored.bodyweight }));
const first = { id: 'a', exercise_id: 'pushup', position: 1, sets: 2, reps_min: 8, reps_max: 8,
  rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: null, name_en: 'Push-up', media_path: null };
const second = { ...first, id: 'b', exercise_id: 'bench', position: 2, name_en: 'Bench press' };
const day: SnapshotDay = { id: 'day', title: 'Push', position: 1, exercises: [first, second], warmup: { items: [], ramp: true } };
function render(exercise = first, weight: number | null = null, bodyweight = false, ramp = true, standard = false) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: standard ? 'standard' : 'egyptian' },
    createElement(RampLine, { day: { ...day, warmup: { items: [], ramp } }, exercise, bodyweight,
      last: weight === null ? null : { sets: [{ set_index: 1, weight_kg: weight, reps: 8 }] } })));
}
afterEach(() => { stored.bodyweight = []; vi.unstubAllEnvs(); });
it('shows the exact percentage ramp copy without known weight, and rounded kg with history', () => {
  expect(render()).toContain('تسخين: 50% × 10 · 70% × 5 · 85% × 2');
  expect(render(first, 63)).toContain('تسخين: 32.5 كجم × 10 · 45 كجم × 5 · 52.5 كجم × 2');
});
it('shows ramp under only the first non-bodyweight exercise and respects the ramp toggle', () => {
  expect(render(second)).toBe('');
  stored.bodyweight = ['pushup'];
  expect(render(first, null, true)).toBe('');
  expect(render(second)).toContain('تسخين:');
  expect(render(second, null, false, false)).toBe('');
  stored.bodyweight = ['pushup', 'bench'];
  expect(render(second, null, true)).toBe('');
});
it('renders simple standard Arabic ramp copy', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(render(first, null, false, true, true)).toContain('إحماء:');
});
