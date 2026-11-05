import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import { exerciseSummary, weekdayStatus } from '../summary';
import { addDay, addExercise } from '../draft';
import type { DraftExercise, ProgramDraft } from '../types';
import { clampReps, repsMode, restPresets, restText, toggleNextSuperset } from './builder-fields';

const row: DraftExercise = { id: 'a', day_id: 'day', exercise_id: 'bench', position: 1,
  sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, library: null };

describe('exercise prescriptions', () => {
  it('derives each reps mode and bounds both numbers without inventing a range', () => {
    expect(repsMode(row)).toBe('range');
    expect(repsMode({ ...row, reps_max: 8 })).toBe('fixed');
    expect(repsMode({ ...row, reps_max: null })).toBe('failure');
    expect(clampReps('fixed', 42, 43)).toEqual({ reps_min: 42, reps_max: 42 });
    expect(clampReps('range', 20, 10)).toEqual({ reps_min: 20, reps_max: 20 });
    expect(clampReps('range', 101, 200)).toEqual({ reps_min: 100, reps_max: 100 });
    expect(clampReps('failure', 8, 12)).toEqual({ reps_min: 8, reps_max: null });
    expect(clampReps('fixed', NaN, 12)).toEqual({ reps_min: 1, reps_max: 1 });
  });
  it('offers familiar rest presets and localized seconds', () => {
    expect(restPresets).toEqual([30, 45, 60, 90, 120, 180, 240]);
    expect(restText(90, 'ar')).toBe('90 ث');
    expect(restText(90, 'en')).toBe('90 s');
  });
  it('summarizes range, fixed and failure in both locales', () => {
    expect(exerciseSummary(row, 'ar')).toBe('3 مجموعات × 8–12 عدّة · راحة 90 ث');
    expect(exerciseSummary(row, 'en')).toBe('3 sets × 8–12 reps · rest 90 s');
    expect(exerciseSummary({ ...row, sets: 1, reps_max: 8 }, 'ar')).toBe('مجموعة واحدة × 8 عدّات · راحة 90 ث');
    expect(exerciseSummary({ ...row, reps_max: null }, 'en')).toContain('to failure');
    expect(exerciseSummary({ ...row, reps_max: null }, 'ar')).toContain('للفشل');
    expect(exerciseSummary({ ...row, reps_min: 1, reps_max: 2 }, 'ar')).toContain('1–2 عدّة');
    expect(exerciseSummary({ ...row, reps_min: 8, reps_max: 10 }, 'ar')).toContain('8–10 عدّات');
  });
});

it('uses Arabic plural categories for exercise, set and minute counts', () => {
  const t = createT(messages, 'ar');
  for (const [key, expected] of [
    ['exerciseCount', ['تمرين واحد', 'تمرينين', '3 تمارين', '11 تمرين']],
    ['setCount', ['مجموعة واحدة', 'مجموعتين', '3 مجموعات', '11 مجموعة']],
    ['minuteCount', ['حوالي دقيقة واحدة', 'حوالي دقيقتين', 'حوالي 3 دقايق', 'حوالي 11 دقيقة']],
  ] as const) expect([1, 2, 3, 11].map(n => t(key, { n, count: String(n) }))).toEqual(expected);
});

it('shows rest or exercise count for a weekday', () => {
  const day = { id: 'day', program_id: 'p', title: '', position: 1, exercises: [row] };
  expect(weekdayStatus(day, 'ar')).toBe('تمرين واحد');
  expect(weekdayStatus({ ...day, is_rest_day: true }, 'ar')).toBe('راحة');
  expect(weekdayStatus({ ...day, exercises: [row, row, row] }, 'en')).toBe('3 exercises');
});

it('links the next exercise and unlinks a group even from the last row', () => {
  let draft: ProgramDraft = { id: 'p', player_id: 'player', status: 'draft', title: 'Plan', days: [] };
  draft = addDay(draft, 'day');
  const library = { id: 'bench', name_en: 'Bench', name_ar: null, body_part: 'chest', equipment: null, media_path: null };
  for (const id of ['a', 'b', 'c']) draft = addExercise(draft, 'day', library, id);
  const linked = toggleNextSuperset(draft, 'day', 'b');
  expect(linked.days[0]?.exercises.map(item => item.superset_group)).toEqual([null, 1, 1]);
  expect(toggleNextSuperset(linked, 'day', 'c').days[0]?.exercises.map(item => item.superset_group)).toEqual([null, null, null]);
  expect(toggleNextSuperset(draft, 'day', 'c')).toEqual(draft);
});

it('matches native controls to the explicit site theme', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  expect(css).toMatch(/html:not\(\[data-theme='light'\]\)\s*\{\s*color-scheme: dark;/);
  expect(css).toMatch(/html\[data-theme='light'\]\s*\{\s*color-scheme: light;/);
  expect(css).not.toContain('color-scheme: light dark');
});
