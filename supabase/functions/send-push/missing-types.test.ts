import { expect, it } from 'vitest';
import { notificationTypes } from '../../../src/types/enums';
import { pushPayload } from './payload';

const cases = [
  ['chat_message', 'Ali بعتلك رسالة', 'أرسل Ali رسالة إليك', 'Ali sent you a message', '/captain/players/p%2F1/chat'],
  ['form_requested', 'الكابتن مستني ردّك على Ali', 'المدرب ينتظر ردك على Ali', 'Your captain is waiting for: Ali', '/player/forms/r%2F1'],
  ['renewal_requested', 'Ali بعت طلب تجديد', 'أرسل Ali طلب تجديد', 'Ali requested a renewal', '/captain/players/p%2F1'],
  ['player_rank_up', 'Ali اترقّى لرتبة جديدة', 'ترقّى Ali إلى رتبة جديدة', 'Ali reached a new rank', '/captain/players/p%2F1'],
] as const;

it.each(cases)('formats and links %s in all three styles', (type, ar, arStd, en, path) => {
  const row = { id: 'event', type, user_id: 'captain', payload: {
    player_id: 'p/1', request_id: 'r/1', name: type === 'player_rank_up' ? 'Wrong' : 'Ali', display_name: 'Ali',
  } };
  expect(pushPayload(row, 'ar')).toMatchObject({ body: ar, url: `/ar${path}` });
  expect(pushPayload(row, 'ar', 'standard')).toMatchObject({ body: arStd, url: `/ar${path}` });
  expect(pushPayload(row, 'en')).toMatchObject({ body: en, url: `/en${path}` });
});

it('routes chat to the player recipient and handles missing routing fields', () => {
  expect(pushPayload({ id: 'n', type: 'chat_message', user_id: 'p', payload: { player_id: 'p' } }).url)
    .toBe('/ar/player/captain');
  for (const type of ['chat_message', 'renewal_requested', 'player_rank_up'] as const) {
    expect(pushPayload({ id: 'n', type, payload: null }).url).toBe('/ar/captain/players');
  }
  expect(pushPayload({ id: 'n', type: 'form_requested', payload: {} }).url).toBe('/ar/player');
});

it.each(['ar', 'en'] as const)('produces a non-empty body for every notification type in %s', locale => {
  for (const type of notificationTypes) {
    expect(pushPayload({ id: 'n', type, payload: {} }, locale).body.trim().length, type).toBeGreaterThan(0);
  }
});

it.each(['future_type', 'toString', '__proto__'])('falls back safely for unknown type %s', type => {
  for (const [locale, style, body] of [
    ['ar', 'egyptian', 'عندك إشعار جديد'], ['ar', 'standard', 'لديك إشعار جديد'],
    ['en', 'egyptian', 'You have a new notification'],
  ] as const) {
    expect(pushPayload({ id: 'future', type, payload: {} }, locale, style))
      .toMatchObject({ body, url: `/${locale}/captain/players` });
    expect(pushPayload({ id: 'future', type, payload: { player_id: 'p/1' } }, locale, style).url)
      .toBe(`/${locale}/captain/players/p%2F1`);
  }
});
