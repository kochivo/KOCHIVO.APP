import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { homeMessages } from './home/messages';
import { greetingPeriod, summaryLine, homeNeeds, endingPlayers, weekComparison } from './home/model';
import type { RosterPlayer } from '@/features/roster';

vi.mock('server-only', () => ({}));
const now = new Date('2026-11-12T10:00:00Z');
const player = (id: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({ playerId: id, fullName: id,
  accessUntil: '2026-12-01', startedOn: '2026-10-01', lastTrainingDate: '2026-11-07', programTitle: 'Program', openTasks: 0, ...extra });

it.each([
  ['Africa/Cairo', '2026-11-12T09:59:00Z', 'morning'], ['Africa/Cairo', '2026-11-12T10:00:00Z', 'evening'],
  ['Asia/Dubai', '2026-11-12T07:59:00Z', 'morning'], ['Asia/Dubai', '2026-11-12T08:00:00Z', 'evening'],
])('switches at local noon in %s (%s)', (timezone, at, expected) => {
  expect(greetingPeriod(new Date(at), timezone)).toBe(expected);
});
it('omits zero summary parts and keeps natural conjunctions', () => {
  const t = createT(homeMessages, 'ar');
  expect(summaryLine({ replies: 4, unpaid: 2, ending: 3 }, t)).toBe('عندك 4 مستنيين ردك، و2 لسه ما دفعوش، و3 اشتراكهم هيخلص الأسبوع ده');
  expect(summaryLine({ replies: 0, unpaid: 2, ending: 0 }, t)).toBe('عندك 2 لسه ما دفعوش');
  expect(summaryLine({ replies: 4, unpaid: 0, ending: 3 }, t)).toBe('عندك 4 مستنيين ردك، و3 اشتراكهم هيخلص الأسبوع ده');
  expect(summaryLine({ replies: 0, unpaid: 0, ending: 0 }, t)).toBe('');
});
it('reserves an absent-player row, caps at four and excludes frozen, pending and duplicate players', () => {
  const rows = [0, 1, 2, 3].map(index => ({ id: String(index), playerId: String(index), name: String(index),
    kind: 'checkin' as const, at: '2026-11-10T10:00:00Z', flags: [], title: '' }));
  const result = homeNeeds(rows, [player('0'), player('absent'), player('frozen', { frozenAt: '2026-11-01' }),
    player('pending', { pending: true }), player('expired', { accessUntil: '2026-11-01' })], now, 'Africa/Cairo');
  expect(result.map(row => row.id)).toEqual(['0', '1', '2', 'absent']);
  expect(result[3]).toMatchObject({ kind: 'absent', days: 5 });
});
it('uses player-local dates for expiry and excludes non-active relationships', () => {
  expect(endingPlayers([player('today', { accessUntil: '2026-11-12' }), player('week', { accessUntil: '2026-11-19' }),
    player('later', { accessUntil: '2026-11-20' }), player('pending', { pending: true, accessUntil: '2026-11-13' })], now, 'Africa/Cairo')
    .map(row => row.playerId)).toEqual(['today', 'week']);
});
it('compares separate weeks and counts a repeated program day once in each week', () => {
  expect(weekComparison([{ playerId: 'p', days: ['a', 'b'] }], [
    { playerId: 'p', dayId: 'a', date: '2026-11-08' }, { playerId: 'p', dayId: 'a', date: '2026-11-09' },
    { playerId: 'p', dayId: 'a', date: '2026-11-01' }, { playerId: 'p', dayId: 'b', date: '2026-11-02' },
  ], '2026-11-12')).toEqual({ current: 50, previous: 100 });
});
