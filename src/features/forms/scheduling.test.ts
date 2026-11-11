import { expect, it } from 'vitest';
import { dueRequests, dueReminders } from './scheduling';

const form = { id: 'f', captain_id: 'c', schedule: { every: 'week' as const, weekday: 2, hour: 12 }, archived_at: null };
const link = { captain_id: 'c', player_id: 'p', archived_at: null, frozen_at: null, pending: false, access_until: '2027-01-01' };
it('sends at Cairo hour, once per period, with no duplicate pending request', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  expect(dueRequests([form], [link], [], now)).toHaveLength(1);
  expect(dueRequests([form], [link], [], new Date('2026-11-03T09:59:00Z'))).toEqual([]);
  for (const answered_at of [null, '2026-11-03T11:00:00Z']) {
    expect(dueRequests([form], [link], [{ form_id: 'f', player_id: 'p', sent_at: now.toISOString(), answered_at }], now)).toEqual([]);
  }
  expect(dueRequests([form], [link], [{ form_id: 'f', player_id: 'p', sent_at: '2026-10-27T10:00:00Z', answered_at: null }], now)).toEqual([]);
});
it('ignores inactive links and archived forms', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  for (const change of [{ pending: true }, { frozen_at: 'x' }, { archived_at: 'x' }, { access_until: '2026-11-02' }])
    expect(dueRequests([form], [{ ...link, ...change }], [], now)).toEqual([]);
  expect(dueRequests([{ ...form, archived_at: 'x' }], [link], [], now)).toEqual([]);
});
it('clamps monthly dates to month end and observes summer Cairo time', () => {
  const monthly = { ...form, schedule: { every: 'month' as const, day: 31, hour: 12 } };
  expect(dueRequests([monthly], [link], [], new Date('2026-06-30T09:00:00Z'))).toHaveLength(1);
  expect(dueRequests([monthly], [link], [], new Date('2026-06-29T09:00:00Z'))).toEqual([]);
});
it('sends again in the next period only after the old request is answered',() => {
  const previous = {form_id:'f',player_id:'p',sent_at:'2026-10-27T10:00:00Z',answered_at:'2026-10-27T11:00:00Z'};
  expect(dueRequests([form],[link],[previous],new Date('2026-11-03T10:00:00Z'))).toHaveLength(1);
  expect(dueRequests([form],[link],[],new Date('2026-11-04T10:00:00Z'))).toEqual([]);
  expect(dueRequests([{...form,schedule:null}],[link],[],new Date('2026-11-03T10:00:00Z'))).toEqual([]);
  expect(dueRequests([form],[{...link,sessions_left:0}],[],new Date('2026-11-03T10:00:00Z'))).toEqual([]);
});
it('reminds only unanswered, unreminded requests at the threshold', () => {
  const request = { id: 'r', sent_at: '2026-11-02T10:00:00Z', answered_at: null, reminded_at: null, remind_after_hours: 24 };
  const now = new Date('2026-11-03T10:00:00Z');
  expect(dueReminders([request], now)).toEqual(['r']);
  for (const change of [{ answered_at: 'x' }, { reminded_at: 'x' }, { remind_after_hours: null }, { sent_at: '2026-11-02T10:01:00Z' }])
    expect(dueReminders([{ ...request, ...change }], now)).toEqual([]);
});
it('accepts an explicit timezone for day, hour and previous-period checks', () => {
  const now = new Date('2026-11-03T08:00:00Z');
  expect(dueRequests([form], [link], [], now, 'Asia/Dubai')).toHaveLength(1);
  expect(dueRequests([form], [link], [], now)).toEqual([]);
  const boundary = new Date('2026-11-02T00:30:00Z');
  const sunday = { ...form, schedule: { every: 'week' as const, weekday: 0, hour: 19 } };
  expect(dueRequests([sunday], [link], [], boundary, 'America/New_York')).toHaveLength(1);
  const monday = { ...form, schedule: { every: 'week' as const, weekday: 1, hour: 0 } };
  const previous = { form_id: 'f', player_id: 'p', sent_at: '2026-11-01T21:00:00Z', answered_at: '2026-11-01T22:00:00Z' };
  expect(dueRequests([monday], [link], [previous], boundary, 'Asia/Dubai')).toEqual([]);
});
