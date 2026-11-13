import { expect, it } from 'vitest';
import { captainThread, threadDay } from './player-thread';
import type { VoiceNote } from './types';

const note: VoiceNote = { id: 'v', url: '/audio', durationSeconds: 24, listenedAt: null,
  createdAt: '2026-11-12T12:00:00Z', contextId: 'checkin' };
it('merges only captain audio and nonempty replies in chronological order', () => {
  const items = captainThread([note], [
    { id: 'later', captain_reply: 'Later reply', reviewed_at: '2026-11-13T10:00:00Z' },
    { id: 'empty', captain_reply: ' ', reviewed_at: '2026-11-12T09:00:00Z' },
    { id: 'earlier', captain_reply: 'Earlier reply', reviewed_at: '2026-11-12T10:00:00Z' },
    { id: 'unreviewed', captain_reply: null, reviewed_at: null },
  ]);
  expect(items.map(item => item.id)).toEqual(['reply:earlier', 'voice:v', 'reply:later']);
});
it('groups dates in the player timezone across UTC midnight', () => {
  const now = new Date('2026-11-13T10:00:00Z');
  expect(threadDay('2026-11-12T23:00:00Z', now, 'Africa/Cairo')).toBe('today');
  expect(threadDay('2026-11-12T10:00:00Z', now, 'Africa/Cairo')).toBe('yesterday');
  expect(threadDay('2026-11-10T10:00:00Z', now, 'Africa/Cairo')).toBe('2026-11-10');
});
it('orders timestamps by their actual time even when offsets differ', () => {
  const items = captainThread([{ ...note, createdAt: '2026-11-13T10:00:00+02:00' }], [
    { id: 'r', captain_reply: 'Later in UTC', reviewed_at: '2026-11-13T09:00:00Z' },
  ]);
  expect(items.map(item => item.id)).toEqual(['voice:v', 'reply:r']);
});
