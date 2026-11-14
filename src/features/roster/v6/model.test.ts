import { expect, it } from 'vitest';
import type { RosterPlayer } from '../types';
import { activityRange, matchesTab, playerStatus, tabCounts, weekDots, withOpenTasks } from './model';

const today = '2026-11-14';
const base: RosterPlayer = { playerId: 'p', fullName: 'Ali', startedOn: '2026-10-01',
  accessUntil: '2026-12-01', lastTrainingDate: today, programTitle: 'Strength', openTasks: 0 };
it('counts overlapping tabs and excludes expired and paused players from doing well', () => {
  const players = [base, { ...base, openTasks: 1 }, { ...base, startedOn: '2026-11-08' },
    { ...base, accessUntil: '2026-11-21' }, { ...base, frozenAt: today }, { ...base, accessUntil: '2026-11-13' }];
  expect(tabCounts(players, today)).toEqual({ all: 6, needsYou: 1, good: 2, newPlayers: 1, ending: 1, stopped: 2 });
  expect(matchesTab({ ...base, startedOn: '2026-11-07' }, 'newPlayers', today)).toBe(false);
  expect(matchesTab({ ...base, startedOn: '2026-11-15' }, 'newPlayers', today)).toBe(false);
  expect(matchesTab({ ...base, accessUntil: today }, 'ending', today)).toBe(true);
});
it('prioritizes paused, video, absence, renewal, missing program and other tasks', () => {
  const urgent = { ...base, openTasks: 2, lastTrainingDate: '2026-11-09', accessUntil: '2026-11-17', programTitle: null };
  expect(playerStatus({ ...urgent, frozenAt: today }, today, true).key).toBe('paused');
  expect(playerStatus(urgent, today, true).key).toBe('video');
  expect(playerStatus(urgent, today).key).toBe('absent');
  expect(playerStatus({ ...urgent, lastTrainingDate: today }, today).key).toBe('renewal');
  expect(playerStatus({ ...base, programTitle: null, openTasks: 1 }, today).key).toBe('needsProgram');
  expect(playerStatus({ ...base, openTasks: 1 }, today).key).toBe('needsYou');
  expect(playerStatus(base, today).key).toBe('good');
});
it('marks completed days lime, only past scheduled days missed, and future days empty', () => {
  expect(weekDots('2026-11-18', ['2026-11-14', '2026-11-16'], [0, 1, 2, 4, 5], '2026-11-15'))
    .toEqual(['done', 'missed', 'done', 'empty', 'empty', 'empty', 'empty']);
});
it('fetches the entire week across player timezones on either side of Saturday midnight', () => {
  expect(activityRange([{ ...base, playerToday: '2026-11-13' }, { ...base, playerToday: '2026-11-15' }], today))
    .toEqual({ start: '2026-11-07', end: '2026-11-15' });
  expect(activityRange([base], today)).toEqual({ start: '2026-11-14', end: today });
});
it('includes answered assessments in needs-you counts alongside legacy review tasks', () => {
  const players = withOpenTasks([base], { p: { dates: [], weekdays: [], rpe: null, video: false, assessments: 1 } });
  expect(tabCounts(players, today).needsYou).toBe(1);
  expect(tabCounts(players, today).good).toBe(0);
});
