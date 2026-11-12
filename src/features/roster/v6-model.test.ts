import { describe, expect, it } from 'vitest';
import { filterRoster, rosterCounts } from './v6-model';
import type { RosterPlayer } from './types';

const today = '2026-11-12';
const base: RosterPlayer = { playerId: 'a', fullName: 'Ali', accessUntil: '2026-12-12', startedOn: today,
  lastTrainingDate: today, programTitle: 'Full body', openTasks: 0 };
describe('v6 roster filters', () => {
  const players = [base, { ...base, playerId: 'b', fullName: 'Mona', programTitle: null },
    { ...base, playerId: 'c', lastTrainingDate: '2026-11-08' },
    { ...base, playerId: 'd', accessUntil: '2026-11-15' },
    { ...base, playerId: 'e', accessUntil: '2026-11-01' }];
  it('counts independent filters and retains expired players in the roster', () => {
    expect(rosterCounts(players, today)).toEqual({ active: 5, needsProgram: 1, late: 1, ending: 1 });
    expect(filterRoster(players, 'active', '', today)).toHaveLength(5);
  });
  it('combines case-insensitive search and each filter', () => {
    expect(filterRoster(players, 'needsProgram', ' MON ', today).map(p => p.playerId)).toEqual(['b']);
    expect(filterRoster(players, 'late', '', today).map(p => p.playerId)).toEqual(['c']);
    expect(filterRoster(players, 'ending', '', today).map(p => p.playerId)).toEqual(['d']);
    expect(filterRoster([], 'active', '', today)).toEqual([]);
  });
});
