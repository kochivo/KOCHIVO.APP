import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref, notificationTextKey } from './format';
import { messages } from './messages';
import { arStd } from './standard/messages';
import type { Notification } from './types';

const cases = [
  ['checkin_submitted', {}, '/captain/players/p/checkins', 'checkin_submitted'],
  ['form_answered', { request_id: 'r/1' }, '/captain/players/p/assessments?requestId=r%2F1#assessment-details', 'form_answered'],
  ['swap_requested', {}, '/captain/players/p', 'swap_requested'],
  ['form_check_submitted', {}, '/captain/tasks', 'form_check_submitted'],
  ['receipt_submitted', {}, '/captain/billing', 'receipt_submitted'],
  ['coach_replied', { kind: 'checkin' }, '/player/captain', 'coach_replied'],
  ['coach_replied', { kind: 'form_check' }, '/player/captain', 'coach_replied_form_check'],
  ['swap_decided', { status: 'approved' }, '/player', 'swap_decided'],
  ['swap_decided', { status: 'declined' }, '/player', 'swap_decided_declined'],
] as const;

it.each(cases)('formats %s with the correct destination and translated named event', (type, payload, href, key) => {
  const row: Notification = { id: 'n', type, payload: { player_id: 'p', display_name: 'Player', captain_name: 'Coach', ...payload },
    created_at: '2026-11-16T10:00:00Z', is_read: false };
  expect(notificationHref(row)).toBe(href);
  expect(notificationTextKey(row)).toBe(key);
  for (const locale of ['ar', 'en'] as const) {
    const text = createT(messages, locale)(notificationTextKey(row), { name: type === 'coach_replied' || type === 'swap_decided' ? 'Coach' : 'Player' });
    expect(text).toContain(type === 'coach_replied' || type === 'swap_decided' ? 'Coach' : 'Player');
    expect(text).not.toContain('{');
  }
  expect(arStd[key]).toContain('{name}');
});

it('encodes player ids and falls back to existing screens when link ids are absent', () => {
  const row: Notification = { id: 'n', type: 'form_answered', payload: { player_id: 'p/1' }, is_read: false, created_at: '' };
  expect(notificationHref(row)).toBe('/captain/players/p%2F1/assessments');
  expect(notificationHref({ ...row, payload: {} })).toBe('/captain/players');
});
