import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref, notificationTextKey } from './format';
import { captainNotification } from './components/captain-notification-format';
import { messages } from './messages';
import type { Notification } from './types';
it('links the seasonal reminder to Ramadan settings with the owner copy', () => {
  const notice: Notification = { id: 'notice', type: 'ramadan_soon', payload: {}, is_read: false, created_at: '2027-01-25T06:00:00Z' };
  expect(notificationHref(notice)).toBe('/captain/settings#ramadan');
  expect(captainNotification(notice.type).href).toBe('/captain/settings#ramadan');
  expect(createT(messages, 'ar')(notificationTextKey(notice))).toBe('رمضان قرّب. تحب تشغّل وضع رمضان لفريقك؟');
  expect(createT(messages, 'en')(notificationTextKey(notice))).toBe('Ramadan is close. Turn on Ramadan mode for your team?');
});
