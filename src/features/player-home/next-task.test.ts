import { describe, expect, it } from 'vitest';
import { playerNextTask } from './next-task';
import type { PlayerTaskInput } from './next-task';
const base: PlayerTaskInput = {
  today: '2026-11-03', intakeDone: true, snapshot: null, sessions: [], meals: [], mealLogs: [],
  checkInWeeks: ['2026-10-31'], voiceNotes: [],
};
const snapshot = { id: 'active' as const, player_id: 'p', program_id: 'program', title: 'Program', notes: null,
  settings: {}, training_days: [2, 3], days: [{ id: 'day', title: 'Push', position: 1, exercises: [] },
    { id: 'next', title: 'Pull', position: 2, exercises: [] }] };
const session = { id: 's', program_day_id: 'day', training_date: base.today, started_at: '2026-11-03T10:00:00Z',
  completed_at: null, client_updated_at: '2026-11-03T10:00:00Z' };
describe('player next task', () => {
  it('prioritizes intake over all other work', () => {
    expect(playerNextTask({ ...base, intakeDone: false, snapshot, meals: [{ id: 'm', name: 'Lunch', position: 1 }], checkInWeeks: [] }).kind).toBe('intake');
  });
  it('starts or continues the scheduled workout before meals', () => {
    const input = { ...base, snapshot, meals: [{ id: 'm', name: 'Lunch', position: 1 }] };
    expect(playerNextTask(input)).toMatchObject({ kind: 'start', href: '/player/workout/day', name: 'Push' });
    expect(playerNextTask({ ...input, sessions: [session] }).kind).toBe('continue');
  });
  it('skips completed workouts and selects the first unlogged meal by position', () => {
    expect(playerNextTask({ ...base, snapshot, sessions: [{ ...session, completed_at: session.started_at }],
      meals: [{ id: 'b', name: 'Dinner', position: 2 }, { id: 'a', name: 'Lunch', position: 1 }] })).toMatchObject({ kind: 'meal', name: 'Lunch' });
  });
  it('ignores other dates, incomplete logs and deleted meal logs', () => {
    const log = { id: 'l', meal_id: 'm', log_date: base.today, swaps: {}, completed_at: session.started_at,
      client_updated_at: session.started_at, deleted_at: null };
    for (const extra of [{ log_date: '2026-11-02' }, { completed_at: null }, { deleted_at: session.started_at }]) {
      expect(playerNextTask({ ...base, meals: [{ id: 'm', name: 'Lunch', position: 1 }], mealLogs: [{ ...log, ...extra }] }).kind).toBe('meal');
    }
    expect(playerNextTask({ ...base, meals: [{ id: 'm', name: 'Lunch', position: 1 }], mealLogs: [log] }).kind).toBe('done');
  });
  it('requests this weeks check-in before the oldest unheard note', () => {
    const voiceNotes = [{ id: 'b', createdAt: '2026-11-02', listenedAt: null }, { id: 'a', createdAt: '2026-11-01', listenedAt: null }];
    expect(playerNextTask({ ...base, checkInWeeks: ['2026-10-24'], voiceNotes }).kind).toBe('checkin');
    expect(playerNextTask({ ...base, voiceNotes })).toMatchObject({ kind: 'voice', id: 'a' });
    expect(playerNextTask({ ...base, voiceNotes: [{ ...voiceNotes[0], id: 'heard', createdAt: '2026-11-01', listenedAt: '2026-11-02' }] }).kind).toBe('done');
  });
  it('rests on unscheduled days, but resumes a started workout', () => {
    const rest = { ...snapshot, training_days: [3] };
    expect(playerNextTask({ ...base, snapshot: rest })).toMatchObject({ kind: 'done', tomorrow: 'Push' });
    expect(playerNextTask({ ...base, snapshot: rest, sessions: [session] }).kind).toBe('continue');
  });
  it('previews the next workout after completing today and respects tomorrow rest days', () => {
    expect(playerNextTask({ ...base, snapshot, sessions: [{ ...session, completed_at: session.started_at }] })).toMatchObject({ kind: 'done', tomorrow: 'Pull' });
    expect(playerNextTask({ ...base, snapshot: { ...snapshot, training_days: [4] } }).tomorrow).toBeUndefined();
  });
  it('uses stable ids for tied meals and voice notes without mutating input', () => {
    const meals = [{ id: 'b', name: 'Second', position: 1 }, { id: 'a', name: 'First', position: 1 }];
    expect(playerNextTask({ ...base, meals }).name).toBe('First');
    expect(meals[0]?.id).toBe('b');
    expect(playerNextTask({ ...base, voiceNotes: [{ id: 'b', createdAt: '2026-11-01', listenedAt: null },
      { id: 'a', createdAt: '2026-11-01', listenedAt: null }] }).id).toBe('a');
  });
});
