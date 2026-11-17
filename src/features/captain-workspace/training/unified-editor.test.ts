import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { emptyWarmup } from '@/features/programs';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { editWarmup, linkNext, trainingDays } from './editor-draft';
import { WarmupBlock } from './warmup-block';
import { TrainingExerciseRow } from './exercise-row';
import { DayRail } from './day-rail';
import { ExerciseFields } from './exercise-fields';
import { DaySummary } from './day-summary';

vi.mock('server-only', () => ({}));
const day: DraftDay = { id: 'd', program_id: 'p', title: 'دفع · صدر وكتف', position: 1, warmup: emptyWarmup(), exercises: [{
  id: 'e', day_id: 'd', exercise_id: 'x', position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90,
  rir: 2, notes: null, superset_group: null,
  library: { id: 'x', name_en: 'Bench Press', name_ar: 'بنش برس', body_part: 'chest', equipment: 'barbell', media_path: null },
}] };
const draft: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'draft', days: [day,
  { ...day, id: 'r1', title: '', is_rest_day: true, exercises: [] },
  { ...day, id: 'r2', title: '', is_rest_day: true, exercises: [] }] };
function render(child: React.ReactNode) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, child));
}
it('keeps the selected rest day visible before the collapsed rest group', () => {
  const html = render(createElement(DayRail, { draft, selectedId: 'r1', onSelect: vi.fn(), update: vi.fn() }));
  expect(html).toMatch(/aria-pressed="true"/);
});
it('hides rest-day stats and uses dashes for empty training durations', () => {
  const empty = { ...day, exercises: [] };
  const rest = render(createElement(DaySummary, { day: { ...empty, is_rest_day: true }, update: vi.fn() }));
  expect(rest).not.toContain('المدة');
  const html = render(createElement(DaySummary, { day: empty, update: vi.fn() }));
  expect(html).toContain('hairline-cells');
  expect(html).toContain('—');
  expect(html).not.toContain('~0');
});
it('keeps warm-up edits in the program snapshot without mutating the initial draft', () => {
  let current = editWarmup(draft, 'd', { items: [{ id: '019ab800-0000-7000-8000-000000000001', name: 'Walk', amount: 5, unit: 'min' }], ramp: true });
  expect(current.days[0]?.warmup.items).toHaveLength(1);
  current = editWarmup(current, 'd', { items: [], ramp: false });
  expect(current.days[0]?.warmup).toEqual({ items: [], ramp: false });
  expect(draft.days[0]?.warmup).toEqual({ items: [], ramp: false });
});
it('renders Arabic first with isolated ascending reps and an initially collapsed row', () => {
  const row = day.exercises[0];
  if (!row) throw new Error('Missing fixture');
  const html = render(createElement(TrainingExerciseRow, { row, onPatch: vi.fn(), onRemove: vi.fn(),
    onMove: vi.fn(), onLink: vi.fn(), dragProps: {}, first: true, last: true }));
  expect(html).toContain('بنش برس');
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('8–12');
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain('textarea');
});
it('collapses rest days into one row without losing their selection controls', () => {
  expect(trainingDays(draft).map(row => row.id)).toEqual(['d']);
  const html = render(createElement(DayRail, { draft, selectedId: 'd', onSelect: vi.fn(), update: vi.fn() }));
  expect(html.match(/راحة باقي الأيام/g)).toHaveLength(1);
  expect(html).not.toContain('اليوم ١ ·');
  expect(html).toContain('دفع · صدر وكتف');
});
it('shows presets, ramp percentages and an accessible collapsed warm-up toggle', () => {
  const html = render(createElement(WarmupBlock, { day, update: vi.fn() }));
  expect(html).toContain('عجلة / مشاية 5 د');
  expect(html).toContain('مجموعات تسخين قبل أول تمرين تقيل');
  expect(html).toContain('aria-expanded="true"');
});
it('links the next exercise and unlinks the entire existing group', () => {
  const row = day.exercises[0];
  if (!row) throw new Error('Missing fixture');
  const two = { ...draft, days: [{ ...day, exercises: [...day.exercises, { ...row, id: 'e2', position: 2 }] }] };
  const linked = linkNext(two, 'd', 'e');
  expect(linked.days[0]?.exercises.map(row => row.superset_group)).toEqual([1, 1]);
  expect(linkNext(linked, 'd', 'e').days[0]?.exercises.map(row => row.superset_group)).toEqual([null, null]);
});
it('isolates expanded rep ranges from RTL and retains failure and optional intensity controls', () => {
  const row = day.exercises[0]; if (!row) throw new Error('Missing fixture');
  const html = render(createElement(ExerciseFields, { row, onPatch: vi.fn() }));
  expect(html).toMatch(/dir="ltr"[^]*value="8–12"/);
  expect(html).toContain('عدّات للفشل');
  expect(html).toContain('الشدة (اختياري)');
});
