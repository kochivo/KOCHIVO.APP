import { describe, expect, it } from 'vitest';
import { Banknote, ClipboardList, Play, Trophy, UserPlus } from 'lucide-react';
import { captainNotification, deduplicateNotifications } from './components/captain-notification-format';
import type { Notification } from './types';

const row = (overrides: Partial<Notification> & Pick<Notification, 'id' | 'type'>): Notification => ({
  payload: {}, is_read: false, created_at: '2026-11-14T09:00:00Z', ...overrides,
});

describe('deduplicateNotifications', () => {
  it('keeps the latest pain and inactivity alert per player', () => {
    const rows = [
      row({ id: 'pain-new', type: 'player_pain', payload: { player_id: 'p', display_name: 'Mariam' }, created_at: '2026-11-14T09:00:00Z' }),
      row({ id: 'pain-old', type: 'player_pain', payload: { player_id: 'p', display_name: 'Mariam' }, created_at: '2026-11-13T09:00:00Z' }),
      row({ id: 'inactive-new', type: 'player_inactive', payload: { player_id: 'p', name: 'Mariam' }, created_at: '2026-11-14T05:00:00Z' }),
      row({ id: 'inactive-old', type: 'player_inactive', payload: { player_id: 'p', name: 'Mariam' }, created_at: '2026-11-11T05:00:00Z' }),
      row({ id: 'pain-other', type: 'player_pain', payload: { player_id: 'q', display_name: 'Ahmed' } }),
    ];
    expect(deduplicateNotifications(rows).map(item => item.id)).toEqual(['pain-new', 'inactive-new', 'pain-other']);
  });
  it('leaves every other event alone, even repeated ones for the same player', () => {
    const rows = [
      row({ id: 'checkin-new', type: 'checkin_submitted', payload: { player_id: 'p', display_name: 'Mariam' } }),
      row({ id: 'checkin-old', type: 'checkin_submitted', payload: { player_id: 'p', display_name: 'Mariam' }, created_at: '2026-11-13T09:00:00Z' }),
      row({ id: 'form', type: 'form_answered', payload: { player_id: 'p', request_id: 'r' } }),
    ];
    expect(deduplicateNotifications(rows).map(item => item.id)).toEqual(['checkin-new', 'checkin-old', 'form']);
  });
});

describe('captain notification destinations and icons', () => {
  it.each([
    ['workout_feedback', Play, '/captain/tasks'],
    ['form_requested', ClipboardList, '/captain/tasks'],
    ['renewal_requested', Banknote, '/captain/billing'],
    ['subscription_expired', Banknote, '/captain/billing'],
    ['join_requested', UserPlus, '/captain/join'],
    ['player_joined', UserPlus, '/captain/join'],
    ['rank_up', Trophy, '/captain/leaderboard'],
    ['crown_taken', Trophy, '/captain/leaderboard'],
  ] as const)('maps %s to its captain screen', (kind, Icon, href) => {
    expect(captainNotification(kind)).toEqual({ Icon, href });
  });
});
