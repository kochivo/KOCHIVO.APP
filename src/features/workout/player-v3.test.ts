import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { SetLogRow } from '@/core/offline';
import { effortChoices, sessionRecords, volumeInTons } from './components/workout-v3-model';
import { FinishRecord } from './components/finish-record';
import { WorkoutHint } from './components/workout-hint';

vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'ar', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'),
}));
it('maps the three efforts to existing RPE values without changing the 1–10 contract', () => {
  expect(effortChoices).toEqual([{ key: 'v3Easy', value: 3 }, { key: 'v3Right', value: 6 }, { key: 'v3Hard', value: 9 }]);
});
it('formats session kilograms as tons with one decimal including zero', () => {
  expect(volumeInTons(4300, 'en')).toBe('4.3');
  expect(volumeInTons(0, 'en')).toBe('0.0');
  expect(volumeInTons(950, 'en')).toBe('1.0');
});
const row = (id: string, weight: number, session = 'old', deleted_at: string | null = null): SetLogRow => ({
  id, session_id: session, exercise_id: 'bench', program_exercise_id: 'p', set_index: 1,
  weight_kg: weight, reps: 8, completed_at: session === 'old' ? '2026-11-12T10:00:00Z' : '2026-11-13T10:00:00Z',
  deleted_at, client_updated_at: '2026-11-13T10:00:00Z',
});
it('only includes genuine live PRs from this session against earlier sets', () => {
  expect(sessionRecords([row('a', 75), row('b', 77.5, 'today'), row('c', 90, 'today', 'deleted')], 'today')).toEqual([row('b', 77.5, 'today')]);
  expect(sessionRecords([row('a', 75), row('b', 75, 'today')], 'today')).toEqual([]);
  expect(sessionRecords([row('b', 75, 'today')], 'today')).toEqual([]);
});
it('renders a gold record card only when a record exists', () => {
  expect(renderToStaticMarkup(createElement(FinishRecord, { record: undefined, name: 'بنش' }))).toBe('');
  const html = renderToStaticMarkup(createElement(FinishRecord, { record: row('b', 77.5, 'today'), name: 'بنش' }));
  expect(html).toContain('رقم قياسي جديد'); expect(html).toContain('بنش');
  expect(html).toContain('bg-gold-2/10');
});
it('shows the PR hint only above the best performance, never merely above last time', () => {
  const render = (weight: number, reps: number, history = [{ weight_kg: 80, reps: 8 }]) => renderToStaticMarkup(createElement(WorkoutHint, {
    history, weight, reps, last: { weight_kg: 75, reps: 8 },
  }));
  expect(render(77.5, 8)).not.toContain('لو عملتها');
  expect(render(80, 8)).not.toContain('لو عملتها');
  expect(render(80, 9)).toContain('· لو عملتها يبقى رقم قياسي');
  expect(render(82.5, 8)).toContain('· لو عملتها يبقى رقم قياسي');
  expect(render(82.5, 8, [])).not.toContain('لو عملتها');
});
