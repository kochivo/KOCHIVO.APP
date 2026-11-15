import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { SnapshotDay, SetLogRow } from '@/core/offline';
import { SupersetCue } from './components/superset-cue';
import { DropProgress } from './components/drop-progress';
import { HistorySets } from './components/history-sets';
import { buildQueue } from './queue';
import type { Locale } from '@/core/i18n/locale';

const control = vi.hoisted(() => ({ locale: 'en' as Locale }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => control.locale,
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, control.locale) }));
const day: SnapshotDay = { id: 'd', position: 1, title: 'Day', exercises: [1, 2].map(n => ({
  id: `r${n}`, exercise_id: `e${n}`, name_ar: 'بنش', name_en: 'Bench', position: n, sets: 3,
  reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: 1, rpe: null, tempo: null, notes: null, media_path: null,
  set_plan: [{ reps_min: 8, reps_max: 12, rir: 2, drop: { count: 2, percent: 20, mode: 'failure', reps: null } }],
})) };
const queue = buildQueue(day);
const base: SetLogRow = { id: 'main', session_id: 's', program_exercise_id: 'r1', exercise_id: 'e1', set_index: 1,
  drop_index: 0, weight_kg: 60, reps: 9, completed_at: '2026-11-15', client_updated_at: '2026-11-15', deleted_at: null };
it.each(['ar', 'en'] as const)('shows superset round, member order and immediate next cue in %s', locale => {
  control.locale = locale;
  const state = { day, current: queue[2], next: queue[3] };
  const header = renderToStaticMarkup(createElement(SupersetCue, { state }));
  const next = renderToStaticMarkup(createElement(SupersetCue, { state, next: true }));
  expect(header).toContain(locale === 'en' ? 'Superset A' : 'سوبرست A');
  expect(header).toContain('A1'); expect(header).toContain('A2');
  expect(next).toContain(locale === 'en' ? 'Next straight away: Bench' : 'بعدها على طول: بنش');
});
it('shows main, active and future drops and nests their performance under the main set', () => {
  control.locale = 'en';
  const html = renderToStaticMarkup(createElement(DropProgress, { state: { current: queue[1], weight: 47.5, doneSets: [base] } }));
  expect(html).toContain('no rest'); expect(html).toContain('Main set'); expect(html).toContain('47.5'); expect(html).toContain('37.5');
  expect(html).toContain('aria-current="step"');
  const history = renderToStaticMarkup(createElement(HistorySets, { sets: [base, { ...base, id: 'drop', drop_index: 1, weight_kg: 47.5, reps: 7 }] }));
  expect(history).toContain('Drops: 47.5 × 7');
  expect((history.match(/<li/g) ?? [])).toHaveLength(1);
});
