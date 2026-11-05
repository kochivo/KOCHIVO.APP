import { expect, it } from 'vitest';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { isRestDay } from './rest-day';

const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'program', title: '', notes: null,
  settings: {}, training_days: [1, 2], days: [{ id: 'day', title: '', position: 1, exercises: [] }] };
it('detects fixed weekday rest except when a session exists today', () => {
  expect(isRestDay(snapshot, [], '2026-11-04')).toBe(true);
  expect(isRestDay(snapshot, [], '2026-11-03')).toBe(false);
  const session: WorkoutSessionRow = { id: 'session', program_day_id: 'day', training_date: '2026-11-04',
    started_at: '', completed_at: null, client_updated_at: '' };
  expect(isRestDay(snapshot, [session], '2026-11-04')).toBe(false);
  expect(isRestDay({ ...snapshot, training_days: [] }, [], '2026-11-04')).toBe(false);
});
it('uses the picked weekly day', () => {
  const weekly = { ...snapshot, starts_on: '2026-10-31', days: [
    { ...snapshot.days[0], id: 'rest', title: '', position: 1, exercises: [], weekday: 4, is_rest_day: true },
    { id: 'train', title: '', position: 2, exercises: [], weekday: 3 },
  ] };
  expect(isRestDay(weekly, [], '2026-11-04')).toBe(true);
  expect(isRestDay(weekly, [], '2026-11-03')).toBe(false);
});
