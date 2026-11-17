import { expect, it } from 'vitest';
import { conversationDays, conversationDayLabel } from './conversation-dates';

const now = new Date('2026-11-14T22:30:00Z');
it('groups messages by the captain calendar day across UTC midnight', () => {
  const items = [
    { createdAt: '2026-11-04T08:51:00Z' },
    { createdAt: '2026-11-13T21:40:00Z' },
    { createdAt: '2026-11-13T22:28:00Z' },
    { createdAt: '2026-11-14T21:15:00Z' },
    { createdAt: '2026-11-14T22:15:00Z' },
  ];
  expect(conversationDays(items, 'Africa/Cairo').map(group => [group.date, group.items.length]))
    .toEqual([['2026-11-04', 1], ['2026-11-13', 1], ['2026-11-14', 2], ['2026-11-15', 1]]);
});
it('labels today and yesterday in the captain timezone and includes the year on older dates', () => {
  const t = (key: 'today' | 'yesterday') => key;
  expect(conversationDayLabel('2026-11-15', now, 'Africa/Cairo', 'en', t)).toBe('today');
  expect(conversationDayLabel('2026-11-14', now, 'Africa/Cairo', 'en', t)).toBe('yesterday');
  expect(conversationDayLabel('2026-11-04', now, 'Africa/Cairo', 'en', t)).toContain('2026');
  expect(conversationDayLabel('2026-11-14', now, 'America/New_York', 'en', t)).toBe('today');
});
