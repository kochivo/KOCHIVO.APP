import { expect, it } from 'vitest';
import { pushPayload } from './payload';

it.each(['ar', 'en'] as const)('formats crown reminders and routes to rank in %s', locale => {
  for (const [type, needs_workouts, gap, ar, en] of [
    ['crown_close', 2, 0, 'التاج قريب! التمارين الناقصة: 2، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 2, 3 days left'],
    ['crown_close', 0, 0, 'التاج قريب! التمارين الناقصة: 0، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 0, 3 days left'],
    ['crown_close', 3, 51, 'التاج قريب! التمارين الناقصة: 3، وفاضل 3 أيام', 'The crown is close! Workouts still needed: 3, 3 days left'],
    ['crown_close', 0, 14, 'التاج قريب! فاضلك 14 درجة', 'The crown is close! 14 points to go'],
    ['crown_defend', 0, 0, 'حافظ على التاج: فاضل 3 أيام على آخر الشهر', 'Keep the crown: 3 days left this month'],
  ] as const) {
    const result = pushPayload({ id: 'crown', type, payload: { needs_workouts, gap } }, locale);
    expect(result.body).toBe(locale === 'ar' ? ar : en);
    expect(result.body).not.toContain('فاضلك 0 درجة');
    expect(result.url).toBe(`/${locale}/player/rank`);
    expect(result.tag).toBe('crown');
  }
});

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

it.each(['ar', 'en'] as const)('localizes rank tiers and crowns in push payloads in %s', locale => {
  const cases = [
    ['rank_up', { tier: 'champion', lifetime: 100 }, 'اترقيت! بقيت بطل', 'You ranked up to Champion'],
    ['rank_up', { tier: 'elite', lifetime: 300 }, 'اترقيت! بقيت نخبة', 'You ranked up to Elite'],
    ['rank_up', { tier: 'legend', lifetime: 600 }, 'اترقيت! بقيت أسطورة', 'You ranked up to Legend'],
    ['crown_taken', { captain_id: 'c', month: '2026-11-01' }, 'التاج بقى معاك. حافظ عليه', 'The crown is yours. Keep it'],
    ['crown_lost', { captain_id: 'c', month: '2026-11-01' }, 'التاج اتاخد منك. رجّعه', 'You lost the crown. Take it back'],
  ] as const;
  for (const [type, payload, ar, en] of cases) {
    expect(pushPayload({ id: 'rank-event', type, payload }, locale)).toEqual({
      title: locale === 'ar' ? 'إشعارات كوتشيفو' : 'KOCHIVO notifications',
      body: locale === 'ar' ? ar : en,
      url: `/${locale}/player/rank`, tag: 'rank-event',
    });
  }
});

it.each(['ar', 'en'] as const)('uses generic push text for missing or invalid rank tiers in %s', locale => {
  for (const payload of [null, {}, { tier: 'beginner' }, { tier: 'toString' }, { tier: '' }, { tier: 3 }, { tier: null }]) {
    expect(pushPayload({ id: 'rank-event', type: 'rank_up', payload }, locale)).toEqual({
      title: locale === 'ar' ? 'إشعارات كوتشيفو' : 'KOCHIVO notifications',
      body: locale === 'ar' ? 'اترقيت لرتبة جديدة' : 'You reached a new rank',
      url: `/${locale}/player/rank`, tag: 'rank-event',
    });
  }
});
