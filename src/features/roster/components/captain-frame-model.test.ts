import { expect, it } from 'vitest';
import { frameCounts, frameItems, frameParent } from './captain-frame-model';

it('maps independent counts without treating unavailable data as zero', () => {
  expect(frameCounts({ tasks: 7, chats: { a: 2, b: 3 }, joins: 4 })).toEqual({ tasks: 7, inbox: 5, join: 4, billing: null });
  expect(frameCounts({ tasks: null, chats: null, joins: null })).toEqual({ tasks: null, inbox: null, join: null, billing: null });
  expect(frameCounts({ tasks: 0, chats: {}, joins: 0 }).inbox).toBe(0);
});

it('hides destinations that have no route yet', () => {
  const available = frameItems.filter(item => item.available).map(item => item.id);
  expect(available).not.toContain('tasks');
  expect(available).not.toContain('join');
});

it.each([
  ['/captain/players/id/programs', 'players'], ['/captain/programs/id', 'programs'],
  ['/captain/nutrition/id', 'plans'], ['/captain/library/exercises/id/edit', 'exercises'],
  ['/captain/billing/packages', 'billing'], ['/captain/notifications', 'home'],
])('maps %s to the mockup parent %s', (path, parent) => {
  expect(frameParent(path)).toBe(parent);
});
