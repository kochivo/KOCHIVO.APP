import { CalendarClock, CircleAlert } from 'lucide-react';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref, notificationIcon, notificationTextKey } from './format';
import { messages } from './messages';
import type { Notification } from './types';

it.each(['ar', 'en'] as const)('maps expiry text, icons and destinations for both recipients in %s', locale => {
  const t = createT(messages, locale);
  for (const type of ['subscription_expiring', 'subscription_expired'] as const) {
    for (const captain of [true, false]) {
      const row: Notification = { id: 'n', type, is_read: false, created_at: '2026-11-03T06:05:00Z',
        payload: captain ? { player_id: 'p', name: 'Ali' } : { captain_name: 'Mona' } };
      expect(notificationHref(row)).toBe(captain ? '/captain/players/p' : '/player');
      expect(notificationIcon(row)).toBe(type === 'subscription_expiring' ? CalendarClock : CircleAlert);
      const text = t(notificationTextKey(row), { name: row.payload.name ?? row.payload.captain_name ?? '' });
      const expected = locale === 'ar'
        ? captain ? type === 'subscription_expiring' ? 'اشتراك Ali هيخلص بعد 3 أيام' : 'اشتراك Ali خلص النهارده'
          : type === 'subscription_expiring' ? 'اشتراكك مع كابتن Mona هيخلص بعد 3 أيام' : 'اشتراكك خلص النهارده، كلّم كابتنك'
        : captain ? type === 'subscription_expiring' ? "Ali's subscription ends in 3 days" : "Ali's subscription ends today"
          : type === 'subscription_expiring' ? 'Your subscription with captain Mona ends in 3 days' : 'Your subscription ends today, contact your captain';
      expect(text).toBe(expected);
    }
  }
});
