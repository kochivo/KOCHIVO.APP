import { Award, Crown } from 'lucide-react';
import { expect, it, vi } from 'vitest';
import { notificationHref, notificationIcon, notificationTextKey, relativeTime } from './format';
import { latestNotifications } from './data/notifications';
import { markOptimistically } from './data/read-state';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Notification, ReadState } from './types';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: load }));

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
  expect(notificationHref({ ...row, type: 'captain_approved' })).toBe('/captain');
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

it.each([
  ['champion', 'اترقيت! بقيت بطل', 'You ranked up to Champion'],
  ['elite', 'اترقيت! بقيت نخبة', 'You ranked up to Elite'],
  ['legend', 'اترقيت! بقيت أسطورة', 'You ranked up to Legend'],
] as const)('localizes rank %s and links its award to the rank screen', (tier, ar, en) => {
  const notification: Notification = { ...row, type: 'rank_up', payload: { tier } };
  expect(notificationTextKey(notification)).toBe(`rank_up_${tier}`);
  expect(createT(messages, 'ar')(notificationTextKey(notification))).toBe(ar);
  expect(createT(messages, 'en')(notificationTextKey(notification))).toBe(en);
  expect(notificationIcon(notification)).toBe(Award);
  expect(notificationHref(notification)).toBe('/player/rank');
});

it.each([undefined, '', 'beginner', 'unknown', 'toString'])('uses generic rank text for tier %s', tier => {
  const notification: Notification = { ...row, type: 'rank_up', payload: { tier } };
  expect(notificationTextKey(notification)).toBe('rank_up');
  expect(createT(messages, 'ar')(notificationTextKey(notification))).toBe('اترقيت لرتبة جديدة');
  expect(createT(messages, 'en')(notificationTextKey(notification))).toBe('You reached a new rank');
  expect(notificationIcon(notification)).toBe(Award);
  expect(notificationHref(notification)).toBe('/player/rank');
});

it.each([
  ['crown_taken', 'التاج بقى معاك. حافظ عليه', 'The crown is yours. Keep it'],
  ['crown_lost', 'التاج اتاخد منك. رجّعه', 'You lost the crown. Take it back'],
] as const)('localizes %s and links its crown to the rank screen', (type, ar, en) => {
  const notification: Notification = { ...row, type, payload: {} };
  expect(notificationTextKey(notification)).toBe(type);
  expect(createT(messages, 'ar')(notificationTextKey(notification))).toBe(ar);
  expect(createT(messages, 'en')(notificationTextKey(notification))).toBe(en);
  expect(notificationIcon(notification)).toBe(Crown);
  expect(notificationHref(notification)).toBe('/player/rank');
});

it('loads only known tiers from rank payloads', async () => {
  const tiers = ['champion', 'elite', 'legend', 'beginner', 'toString', '', 3, null, undefined];
  const data = tiers.map((tier, index) => ({ ...row, id: String(index), type: 'rank_up', payload: { tier, lifetime: 600 } }));
  const query = { select: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data, error: null }) };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  load.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const rows = await latestNotifications();
  expect(rows.map(notification => notification.payload.tier)).toEqual([
    'champion', 'elite', 'legend', undefined, undefined, undefined, undefined, undefined, undefined,
  ]);
  expect(rows.map(notificationTextKey)).toEqual([
    'rank_up_champion', 'rank_up_elite', 'rank_up_legend', 'rank_up', 'rank_up', 'rank_up', 'rank_up', 'rank_up', 'rank_up',
  ]);
});
