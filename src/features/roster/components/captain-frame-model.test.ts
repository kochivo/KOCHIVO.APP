import { expect, it } from 'vitest';
import { frameCounts, frameItems, frameParent } from './captain-frame-model';

it('maps independent counts without treating unavailable data as zero', () => {
  expect(frameCounts({ tasks: 7, chats: { a: 2, b: 3 }, joins: 4 })).toEqual({ tasks: 7, inbox: 5, join: 4, billing: null });
  expect(frameCounts({ tasks: null, chats: null, joins: null })).toEqual({ tasks: null, inbox: null, join: null, billing: null });
  expect(frameCounts({ tasks: 0, chats: {}, joins: 0 }).inbox).toBe(0);
});

it('shows every destination that has a route', () => {
  const available = frameItems.filter(item => item.available).map(item => item.id);
  expect(available).toContain('tasks');
  expect(available).toContain('join');
});

it.each([
  ['/captain/players/id/programs', 'players'], ['/captain/programs/id', 'programs'],
  ['/captain/nutrition/id', 'plans'], ['/captain/library/exercises/id/edit', 'exercises'],
  ['/captain/billing/packages', 'packages'], ['/captain/billing', 'billing'], ['/captain/notifications', null],
  ['/captain/pending', null], ['/captain', 'home'],
  ['/captain/join', 'join'],
])('maps %s to the mockup parent %s', (path, parent) => {
  expect(frameParent(path)).toBe(parent);
});
