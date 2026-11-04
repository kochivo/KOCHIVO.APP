import { expect, it } from 'vitest';
import { notificationHref, relativeTime } from './format';
import { markOptimistically } from './data/read-state';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Notification, ReadState } from './types';

const row: Notification = { id: 'n', type: 'plan_assigned', payload: { name: 'Strength' }, is_read: false,
  created_at: '2026-11-03T08:00:00Z' };
it('marks one immediately and restores the count and rows after failure', async () => {
  const previous = { rows: [row], count: 5 };
  const states: ReadState[] = [];
  const ok = await markOptimistically(previous, 'n', state => states.push(state), async () => { throw new Error('offline'); });
  expect(states[0]).toEqual({ rows: [{ ...row, is_read: true }], count: 4 });
  expect(states[1]).toBe(previous);
  expect(ok).toBe(false);
});
it('marks all unread including those outside the latest twenty', async () => {
  const states: ReadState[] = [];
  expect(await markOptimistically({ rows: [row], count: 30 }, undefined, state => states.push(state), async () => {})).toBe(true);
  expect(states).toEqual([{ rows: [{ ...row, is_read: true }], count: 0 }]);
});
it('does not decrement an already read row', async () => {
  const states: ReadState[] = [];
  await markOptimistically({ rows: [{ ...row, is_read: true }], count: 3 }, 'n', state => states.push(state), async () => {});
  expect(states[0]?.count).toBe(3);
});
it('links each notification to its related screen', () => {
  expect(notificationHref(row)).toBe('/player');
  expect(notificationHref({ ...row, type: 'workout_reminder' })).toBe('/player');
  expect(notificationHref({ ...row, type: 'nutrition_updated' })).toBe('/player/nutrition');
  expect(notificationHref({ ...row, type: 'player_inactive', payload: { name: 'Ali', player_id: 'p' } })).toBe('/captain/players/p');
});
it.each(['ar', 'en'] as const)('renders workout reminder day titles in %s', locale => {
  expect(createT(messages, locale)('workout_reminder', { name: 'Legs' })).toContain('Legs');
});
it('uses an injected clock for relative times', () => {
  expect(relativeTime(row.created_at, Date.parse('2026-11-03T10:00:00Z'))).toEqual({ key: 'hours', n: 2 });
  expect(relativeTime(row.created_at, Date.parse(row.created_at))).toEqual({ key: 'now', n: 0 });
});
it.each(['ar', 'en'] as const)('builds all notification text with payload values in %s', locale => {
  const t = createT(messages, locale);
  for (const type of ['plan_assigned', 'nutrition_updated', 'player_joined', 'player_inactive'] as const) {
    expect(t(type, { name: 'Ali' })).toContain('Ali');
    expect(t(type, { name: 'Ali' })).not.toContain('{');
  }
});
