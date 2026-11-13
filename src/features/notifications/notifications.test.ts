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
it('links a chat notification according to its recipient and formats the sender', () => {
  const notice: Notification = { ...row, type: 'chat_message', user_id: 'player', payload: { name: 'Ali', player_id: 'player' } };
  expect(notificationHref(notice)).toBe('/player/captain');
  expect(notificationHref({ ...notice, user_id: 'captain' })).toBe('/captain/players/player/chat');
  for (const locale of ['ar', 'en'] as const) expect(createT(messages, locale)(notificationTextKey(notice), { name: 'Ali' })).toContain('Ali');
});
it.each(['ar', 'en'] as const)('formats crown reminders with workout or score gaps in %s', locale => {
  const t = createT(messages, locale);
  for (const [type, needs_workouts, gap, ar, en] of [
    ['crown_close', 2, 14, 'التاج قريب! التمارين الناقصة: 2، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 2, 3 days left'],
    ['crown_close', 2, 0, 'التاج قريب! التمارين الناقصة: 2، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 2, 3 days left'],
    ['crown_close', 0, 0, 'التاج قريب! التمارين الناقصة: 0، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 0, 3 days left'],
    ['crown_close', 0, 14, 'التاج قريب! فاضلك 14 درجة', 'The crown is close! 14 points to go'],
    ['crown_defend', 0, 0, 'حافظ على التاج: فاضل 3 أيام على آخر الشهر', 'Keep the crown: 3 days left this month'],
  ] as const) {
    const notice: Notification = { ...row, type, payload: { needs_workouts, gap } };
    expect(t(notificationTextKey(notice), { n: needs_workouts, gap })).toBe(locale === 'ar' ? ar : en);
    expect(notificationIcon(notice)).toBe(Crown);
    expect(notificationHref(notice)).toBe('/player/rank');
  }
});
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
  const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data, error: null }) };
  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
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

it('preserves numeric crown gaps when loading stored notifications', async () => {
  const data = [{ ...row, type: 'crown_close', payload: { needs_workouts: 0, gap: 14 } },
    { ...row, type: 'crown_close', payload: { needs_workouts: '2', gap: null } }];
  const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data, error: null }) };
  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  load.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const rows = await latestNotifications();
  expect(rows[0]?.payload).toMatchObject({ needs_workouts: 0, gap: 14 });
  expect(rows[1]?.payload.needs_workouts).toBeUndefined();
  expect(rows[1]?.payload.gap).toBeUndefined();
});

it('filters rank and crown notifications out of the bell while ranks are hidden', async () => {
  vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '');
  const query = { select: vi.fn(), not: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  load.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  await latestNotifications();
  expect(query.not).toHaveBeenCalledWith('type', 'in', '(rank_up,crown_taken,crown_lost,crown_close,crown_defend)');
  vi.unstubAllEnvs();
});
