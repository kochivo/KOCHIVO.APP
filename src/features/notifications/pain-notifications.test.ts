import { expect, it } from 'vitest';
import { notificationHref, notificationIcon, notificationTextKey } from './format';
import type { Notification } from './types';

it('opens urgent reports in the player file and answers on the player side', () => {
  const row: Notification = { id: 'report', type: 'player_pain', payload: { player_id: 'player' }, is_read: false, created_at: '2026-11-15T10:00Z' };
  expect(notificationHref(row)).toBe('/captain/players/player#pain-reports');
  expect(notificationIcon(row)).not.toBeNull();
  expect(notificationTextKey(row)).toBe('player_pain');
  expect(notificationHref({ ...row, type: 'pain_answered' })).toBe('/player/captain');
});
