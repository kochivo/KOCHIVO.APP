import { expect, it } from 'vitest';
import { pushPayload } from './payload';

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
