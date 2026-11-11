import { expect, it } from 'vitest';
import { queueRow, sortQueue } from './model';
import type { QueueItem } from './model';
const now = new Date('2026-11-11T12:00:00Z');
const item: QueueItem = { id: 'a', player_id: 'p', player_name: 'Ahmed', kind: 'checkin',
  created_at: '2026-11-10T11:00:00Z', reviewed_at: null, reply: null,
  week_start: '2026-11-07', body_weight_kg: 81, waist_cm: 84, notes: null };
const previous = { source: { kind: 'checkin', id: 'old', at: '2026-11-01T12:00:00Z' }, facts: { weight: 82, waist: 86 } };
it('prioritizes an alerting custom form answer as danger like a new injury',() => {
  const row = queueRow({kind:'request',id:'r',player_id:'p',player_name:'Ahmed',title:'Injury',
    created_at:now.toISOString(),reviewed_at:null,reply:null,alert:true,
    snapshot:{source:{kind:'form',id:'r',at:now.toISOString()},facts:{}}},undefined,now);
  expect(row).toMatchObject({kind:'form',newInjury:true,changes:[{key:'injury',style:'danger'}]});
});
it('compares adapter facts, limits chips and measures waiting time with injected now', () => {
  expect(queueRow(item, previous, now)).toMatchObject({ ageHours: 25, late: true,
    player: { id: 'p', name: 'Ahmed' }, changes: [
      { key: 'weight', delta: -1, style: 'neutral' }, { key: 'waist', delta: -2, style: 'neutral' },
    ] });
  expect(queueRow({ ...item, created_at: '2026-11-10T12:00:00Z' }, undefined, now).late).toBe(false);
  expect(queueRow(item, undefined, now).changes).toEqual([{ key: 'noChange', style: 'neutral' }]);
});
it('prioritizes new injuries, then late, then newest and leaves inputs untouched', () => {
  const injury = queueRow({ ...item, id: 'injury', created_at: '2026-11-11T10:00:00Z',
    snapshot: { source: { kind: 'checkin', id: 'injury', at: '2026-11-11T10:00:00Z' },
      facts: { injuries: ['knee'], trainingDays: [1], weight: 83, waist: 85 } } },
  { ...previous, facts: { ...previous.facts, injuries: [], trainingDays: [2] } }, now);
  expect(injury.changes).toHaveLength(3);
  expect(injury.changes[0]).toMatchObject({ key: 'injury', style: 'danger' });
  expect(injury.changes[1]).toMatchObject({ key: 'trainingDays', style: 'warn' });
  const late = queueRow(item, previous, now);
  const fresh = queueRow({ ...item, id: 'fresh', created_at: '2026-11-11T11:00:00Z' }, undefined, now);
  const rows = [fresh, late, injury];
  expect(sortQueue(rows).map(row => row.item.id)).toEqual(['injury', 'a', 'fresh']);
  expect(rows[0]).toBe(fresh);
});
it('does not treat unchanged injuries or reviewed items as urgent', () => {
  const reviewed = queueRow({ ...item, reviewed_at: '2026-11-10T12:00:00Z' }, previous, now);
  expect(reviewed.late).toBe(false);
  expect(reviewed.ageHours).toBe(1);
  const snapshot = { source: { kind: 'checkin', id: 'a', at: item.created_at }, facts: { injuries: ['knee'], trainingDays: [1, 2] } };
  const unchanged = queueRow({ ...item, snapshot }, { ...previous, facts: { injuries: ['knee'], trainingDays: [2, 1] } }, now);
  expect(unchanged.newInjury).toBe(false);
  expect(unchanged.changes).toEqual([{ key: 'noChange', style: 'neutral' }]);
});
