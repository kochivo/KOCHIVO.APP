import { expect, it } from 'vitest';
import { accountStats } from './player-account-stats';
import type { ProgramSnapshot } from '@/core/offline';

it('merges synced and offline sessions by id and counts every completed session', () => {
  const result = accountStats({ today: '2026-11-13', remote: [
    { id: 'one', training_date: '2026-11-12', completed_at: '2026-11-12T10:00Z', client_updated_at: '2026-11-12T10:00Z' },
  ], local: [
    { id: 'one', training_date: '2026-11-12', completed_at: '2026-11-12T10:00Z', client_updated_at: '2026-11-12T10:00Z' },
    { id: 'two', training_date: '2026-11-13', completed_at: '2026-11-13T10:00Z', client_updated_at: '2026-11-13T10:00Z' },
    { id: 'unfinished', training_date: '2026-11-13', completed_at: null, client_updated_at: '2026-11-13T10:00Z' },
  ] });
  expect(result).toEqual({ total: 2, streak: 2 });
});
it('allows today to remain unfinished but breaks a streak on a missed earlier training day', () => {
  const remote = ['2026-11-10', '2026-11-12'].map(date => ({ id: date, training_date: date,
    completed_at: `${date}T10:00Z`, client_updated_at: `${date}T10:00Z` }));
  expect(accountStats({ today: '2026-11-13', remote, local: [] })).toEqual({ total: 2, streak: 1 });
  expect(accountStats({ today: '2026-11-13', remote: [], local: [] })).toEqual({ total: 0, streak: 0 });
});

it('keeps a streak over scheduled rest days and ignores an older local copy of a session', () => {
  const snapshot: ProgramSnapshot = { id: 'active', player_id: 'p', program_id: 'program', title: 'Plan',
    notes: null, settings: {}, training_days: [2, 4], days: [] };
  const remote = ['2026-11-10', '2026-11-12'].map(date => ({ id: date, training_date: date,
    completed_at: `${date}T10:00Z`, client_updated_at: `${date}T12:00Z` }));
  const local = [{ id: '2026-11-12', training_date: '2026-11-12', completed_at: null, client_updated_at: '2026-11-12T08:00Z' }];
  expect(accountStats({ today: '2026-11-13', remote, local, snapshot })).toEqual({ total: 2, streak: 2 });
});
