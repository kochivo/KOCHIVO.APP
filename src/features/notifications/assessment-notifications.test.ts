import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { notificationHref, notificationTextKey } from './format';
import { messages } from './messages';
import type { Notification } from './types';

afterEach(() => vi.unstubAllEnvs());
it('formats assessment replies and links to the answered request in every language style', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const row = { id: 'notice', type: 'coach_replied', payload: { kind: 'assessment', request_id: 'a/b', captain_name: 'Sam' },
    is_read: false, created_at: '2026-11-03T10:00:00Z' } as Notification;
  expect(notificationHref(row)).toBe('/player/forms/a%2Fb');
  const key = notificationTextKey(row);
  expect(key).toBe('coach_replied_assessment');
  for (const [locale, style, text] of [
    ['ar', 'egyptian', 'كابتن Sam رد على التقييم'],
    ['ar', 'standard', 'ردّ المدرب Sam على التقييم'],
    ['en', 'egyptian', 'Sam replied to your assessment'],
  ] as const) {
    expect(createT(messages, locale, style)(key, { name: 'Sam' })).toBe(text);
  }
});
