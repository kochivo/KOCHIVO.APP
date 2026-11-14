import { describe, expect, it } from 'vitest';
import { Banknote, ClipboardList, Play, Trophy, UserPlus } from 'lucide-react';
import { captainNotification } from './components/captain-notification-format';

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
