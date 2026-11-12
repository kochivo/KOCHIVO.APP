import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
import { monthlyPayments, weeklyAdherence, activePlayerCount } from './workspace-maths';
import { captainNextTasks, taskIsPrimary } from './next-task';
import type { RosterPlayer } from '@/features/roster';
const player: RosterPlayer = { playerId: 'a', fullName: 'Ali', startedOn: '2026-11-01', accessUntil: '2026-11-15',
  programTitle: null, lastTrainingDate: '2026-11-11', openTasks: 2 };
describe('v6 home', () => {
  it('orders reviews, program, food, ending, dues and marks only the first primary', () => {
    const tasks = captainNextTasks([player], new Map([['a', 100]]), '2026-11-12', { mealPlanPlayers: new Set() });
    expect(tasks.map(task => task.kind)).toEqual(['review', 'noProgram', 'noMealPlan', 'renew', 'dues']);
    expect(tasks.map((_, index) => taskIsPrimary(index))).toEqual([true, false, false, false, false]);
  });
  it('sums amounts rather than prices in the captain calendar month', () => {
    const payments = [{ created_at: '2026-10-31T22:30:00Z', amount_egp: 100 },
      { created_at: '2026-11-30T22:30:00Z', amount_egp: 900 }, { created_at: '2026-11-15T12:00:00Z', amount_egp: null }];
    expect(monthlyPayments(payments, new Date('2026-11-12T12:00:00Z'), 'Africa/Cairo')).toBe(100);
    expect(monthlyPayments(payments, new Date('2026-11-12T12:00:00Z'), 'UTC')).toBe(900);
  });
  it('computes weighted weekly adherence, caps completion and handles no plan', () => {
    expect(weeklyAdherence([{ planned: 3, done: 2 }, { planned: 1, done: 4 }])).toBe(75);
    expect(weeklyAdherence([])).toBe(0);
  });
  it('counts ending-soon subscriptions as active but excludes pending, frozen and expired players', () => {
    expect(activePlayerCount([player, { ...player, pending: true }, { ...player, frozenAt: '2026-11-01' },
      { ...player, accessUntil: '2026-11-11' }], '2026-11-12')).toBe(1);
  });
});
