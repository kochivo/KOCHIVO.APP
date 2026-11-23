import { expect, it } from 'vitest';
import { weekComparison } from './model';

it('counts rotating occurrences and repeated day completions by date from Saturday', () => {
  expect(weekComparison([{ playerId: 'p', days: [{ id: 'a', weekday: null, isRestDay: false }], trainingDays: [0, 2, 4] }], [
    { playerId: 'p', dayId: 'a', date: '2026-11-15' },
    { playerId: 'p', dayId: 'a', date: '2026-11-15' },
    { playerId: 'p', dayId: 'a', date: '2026-11-08' },
    { playerId: 'p', dayId: 'a', date: '2026-11-10' },
  ], '2026-11-17')).toEqual({ current: 33, previous: 67 });
});

it('excludes rest dates, unscheduled dates, unrelated days and duplicate sessions', () => {
  const program = { playerId: 'p', days: [
    { id: 'a', weekday: 0, isRestDay: false }, { id: 'b', weekday: 2, isRestDay: false },
    { id: 'rest', weekday: 1, isRestDay: true },
  ], trainingDays: [0, 1, 2, 3, 4, 5, 6] };
  expect(weekComparison([program], [
    { playerId: 'p', dayId: 'a', date: '2026-11-14' },
    { playerId: 'p', dayId: 'a', date: '2026-11-14' },
    { playerId: 'p', dayId: 'rest', date: '2026-11-15' },
    { playerId: 'p', dayId: 'other', date: '2026-11-16' },
    { playerId: 'p', dayId: 'b', date: '2026-11-17' },
  ], '2026-11-17')).toEqual({ current: 50, previous: 0 });
});

it('returns zero for no plans, empty intake and rest-only rotation', () => {
  expect(weekComparison([], [], '2026-11-17')).toEqual({ current: 0, previous: 0 });
  expect(weekComparison([{ playerId: 'p', days: [{ id: 'r', weekday: null, isRestDay: true }], trainingDays: [0] }],
    [], '2026-11-17')).toEqual({ current: 0, previous: 0 });
  expect(weekComparison([{ playerId: 'p', days: [{ id: 'a', weekday: null, isRestDay: false }], trainingDays: [] }],
    [], '2026-11-17')).toEqual({ current: 0, previous: 0 });
});

it('keeps a real previous-week delta when this week is empty, so a -25% badge is not vacuous', () => {
  expect(weekComparison([{ playerId: 'p', days: [
    { id: 'a', weekday: 0, isRestDay: false }, { id: 'b', weekday: 1, isRestDay: false },
    { id: 'c', weekday: 2, isRestDay: false }, { id: 'd', weekday: 3, isRestDay: false },
  ], trainingDays: [0, 1, 2, 3] }], [
    { playerId: 'p', dayId: 'a', date: '2026-11-07' },
  ], '2026-11-17')).toEqual({ current: 0, previous: 25 });
});

it('weights players by planned dates and deduplicates overlapping programs and weekdays', () => {
  const rotation = { playerId: 'p', days: [{ id: 'a', weekday: null, isRestDay: false }], trainingDays: [0, 0, 2, 4] };
  expect(weekComparison([rotation, rotation, { playerId: 'q', days: [{ id: 'b', weekday: 0, isRestDay: false }], trainingDays: [] }], [
    { playerId: 'p', dayId: 'a', date: '2026-11-15' },
    { playerId: 'q', dayId: 'b', date: '2026-11-14' },
  ], '2026-11-17')).toEqual({ current: 50, previous: 0 });
});
