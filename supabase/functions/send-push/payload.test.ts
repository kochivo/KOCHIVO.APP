import { expect, it } from 'vitest';
import { pushPayload } from './payload';

it.each(['ar', 'en'] as const)('formats both expiry reminders for each recipient in %s', locale => {
  for (const type of ['subscription_expiring', 'subscription_expired'] as const) {
    for (const captain of [true, false]) {
      const result = pushPayload({ id: 'n', type,
        payload: captain ? { name: 'Ali', player_id: 'p' } : { captain_name: 'Mona' } }, locale);
      expect(result.url).toBe(`/${locale}${captain ? '/captain/players/p' : '/player'}`);
      const expected = locale === 'ar'
        ? captain ? type === 'subscription_expiring' ? 'اشتراك Ali هيخلص بعد 3 أيام' : 'اشتراك Ali خلص النهارده'
          : type === 'subscription_expiring' ? 'اشتراكك مع كابتن Mona هيخلص بعد 3 أيام' : 'اشتراكك خلص النهارده، كلّم كابتنك'
        : captain ? type === 'subscription_expiring' ? "Ali's subscription ends in 3 days" : "Ali's subscription ends today"
          : type === 'subscription_expiring' ? 'Your subscription with captain Mona ends in 3 days' : 'Your subscription ends today, contact your captain';
      expect(result.body).toBe(expected);
      expect(result.tag).toBe('n');
    }
  }
});

it.each(['ar', 'en'] as const)('links captain approval to their dashboard in %s', locale => {
  const payload = pushPayload({ id: 'n', type: 'captain_approved', payload: {} }, locale);
  expect(payload.url).toBe(`/${locale}/captain`);
  expect(payload.body).toContain('KOCHIVO');
});

it.each(['ar', 'en'] as const)('localizes session exhaustion and links the player in %s', locale => {
  const payload = pushPayload({ id: 'n', type: 'sessions_used_up', payload: { player_id: 'p' } }, locale);
  expect(payload.url).toBe(`/${locale}/captain/players/p`);
  expect(payload.body.length).toBeGreaterThan(0);
  expect(/[\u0600-\u06ff]/.test(payload.body)).toBe(locale === 'ar');
});

it.each(['ar', 'en'] as const)('links feedback to the resolved player without exposing the note in %s', locale => {
  const payload = pushPayload({ id: 'n', type: 'workout_feedback', player_id: 'p',
    payload: { session_id: 's', rpe: 9, has_note: true, player_note: 'private pain details' } }, locale);
  expect(payload.url).toBe(`/${locale}/captain/players/p`);
  expect(payload.body).not.toContain('private pain details');
  expect(/[؀-ۿ]/.test(payload.body)).toBe(locale === 'ar');
});

it.each(['ar', 'en'] as const)('localizes every notification and links the correct screen in %s', locale => {
  const cases = [
    ['plan_assigned', '/player'], ['nutrition_updated', '/player/nutrition'],
    ['player_joined', '/captain/players/p'], ['player_inactive', '/captain/players/p'],
    ['join_requested', '/captain/players'], ['workout_reminder', '/player'],
  ] as const;
  for (const [type, path] of cases) {
    const payload = pushPayload({ id: 'n', type, payload: { name: 'Ali', day_title: 'Legs', player_id: 'p' } }, locale);
    expect(payload.url).toBe(`/${locale}${path}`);
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body).toContain(type === 'workout_reminder' ? 'Legs' : 'Ali');
    expect(payload.body).not.toContain('{');
    expect(payload.tag).toBe('n');
    expect(/[\u0600-\u06ff]/.test(payload.title)).toBe(locale === 'ar');
  }
});
it('defaults to Arabic and handles missing or invalid payload fields', () => {
  const payload = pushPayload({ id: 'n', type: 'player_joined', payload: { player_id: '//evil.test', name: 5 } });
  expect(payload.url).toBe('/ar/captain/players/%2F%2Fevil.test');
  expect(payload.body).not.toContain('undefined');
  expect(pushPayload({ id: 'n', type: 'workout_reminder', payload: null }).url).toBe('/ar/player');
});
