import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ProgramWeekPill } from './program-week-pill';
import { PlayerProgramSummary } from './player-program-summary';
import { programSummary } from './player-program-model';
import { ProgramPrescriptionRow } from './program-prescription-row';
import type { ProgramDraft } from '@/features/programs';

vi.mock('next/dynamic', () => ({ default: () => () => null }));

it('renders the real elapsed assignment week and duration in Arabic', () => {
  const html = renderToStaticMarkup(createElement(ProgramWeekPill, {
    startedOn: '2026-10-10', totalWeeks: 12, today: '2026-11-14', locale: 'ar',
  }));
  expect(html).toContain('الأسبوع 6 من 12');
});
it.each([
  { startedOn: null, totalWeeks: 12 }, { startedOn: '2026-10-10', totalWeeks: null },
  { startedOn: 'invalid', totalWeeks: 12 }, { startedOn: '2026-10-10', totalWeeks: 0 },
  { startedOn: '2026-12-01', totalWeeks: 12 },
  { startedOn: '2026-02-30', totalWeeks: 12 },
])('hides an unknown, invalid or not-yet-started assignment week: %j', assignment => {
  expect(renderToStaticMarkup(createElement(ProgramWeekPill, { ...assignment, today: '2026-11-14', locale: 'ar' }))).toBe('');
});
it('offers the builder instead of an invented program when no active assignment exists', () => {
  const html = renderToStaticMarkup(createElement(PlayerProgramSummary, {
    playerId: 'player', program: null, today: '2026-11-14', locale: 'ar',
  }));
  expect(html).toContain('مفيش برنامج لسه');
  expect(html).toContain('ادّيله برنامج');
  expect(html).not.toContain('الأسبوع');
  expect(html).not.toContain('عدّل');
});
const program: ProgramDraft = { id: 'plan', player_id: 'player', title: 'Strength', status: 'active', settings: { repeatWeekly: true }, days: [
  { id: 'day', program_id: 'plan', title: 'Legs', position: 1, warmup: { items: [], ramp: false }, exercises: [
    { id: 'row', day_id: 'day', exercise_id: 'squat', position: 1, sets: 4, reps_min: 6, reps_max: 8, rest_seconds: 90,
      rir: null, notes: null, superset_group: null, library: { id: 'squat', name_ar: 'سكوات', name_en: 'Squat', media_path: null, body_part: 'upper legs', equipment: null } },
  ] },
] };
it('shows the prescription and edit route without inferring assignment dates or weight', () => {
  const html = renderToStaticMarkup(createElement(PlayerProgramSummary, {
    playerId: 'player', program: programSummary(program), today: '2026-11-14', locale: 'ar',
  }));
  for (const value of ['Strength', 'سكوات', '4 × 6–8', 'راحة 90 ثانية', 'href="/captain/programs/plan"']) expect(html).toContain(value);
  expect(html).not.toContain('الأسبوع');
  expect(html).not.toContain('كجم');
});
it('continues an existing draft from the empty state', () => {
  const html = renderToStaticMarkup(createElement(PlayerProgramSummary, {
    playerId: 'player', program: null, draftId: 'draft', today: '2026-11-14', locale: 'ar',
  }));
  expect(html).toMatch(/href="\/captain\/programs\/draft"[^]*ادّيله برنامج/);
});
it('keeps individual set targets and zero rest instead of replacing them with a uniform prescription', () => {
  const row = programSummary(program).days[0]?.exercises[0];
  if (!row) throw new Error('Missing fixture');
  const html = renderToStaticMarkup(createElement(ProgramPrescriptionRow, { row: { ...row, rest_seconds: 0,
    set_plan: [{ reps_min: 12, reps_max: 12, rir: null }, { reps_min: 8, reps_max: 10, rir: null }],
  }, locale: 'en' }));
  expect(html).toContain('12 · 8–10');
  expect(html).toContain('Rest 0 seconds');
});
it.each([
  ['2026-10-10', 'Week 1 of 12'], ['2026-10-17', 'Week 2 of 12'], ['2027-01-30', 'Week 12 of 12'],
])('uses assignment-relative week boundaries on %s', (today, text) => {
  expect(renderToStaticMarkup(createElement(ProgramWeekPill, { startedOn: '2026-10-10', totalWeeks: 12, today, locale: 'en' }))).toContain(text);
});
it('renders a cardio-only prescription instead of claiming the day is empty', () => {
  const day = program.days[0];
  if (!day) throw new Error('Missing fixture');
  const html = renderToStaticMarkup(createElement(PlayerProgramSummary, {
    playerId: 'player', program: programSummary({ ...program, days: [{ ...day, exercises: [], cardio: [
      { id: 'cardio', day_id: day.id, position: 1, kind: 'Bike', minutes: 25, intensity: 'moderate', notes: 'Easy pace' },
    ] }] }), today: '2026-11-14', locale: 'en',
  }));
  for (const text of ['Bike', '25 minutes', 'Moderate', 'Easy pace']) expect(html).toContain(text);
  expect(html).not.toContain('No exercises for this day');
});
