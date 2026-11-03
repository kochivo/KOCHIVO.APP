import { expect, it } from 'vitest';
import { decideRoute } from './routing';

it('preserves coach signup intent for signed-in players while enforcing suspension', () => {
  const user = { role: 'player', roleConfirmed: true } as const;
  expect(decideRoute({ path: '/login', coach: 'ahmed', user })).toEqual({});
  expect(decideRoute({ path: '/login', coach: 'admin', user })).toEqual({ redirect: '/player' });
  expect(decideRoute({ path: '/login', coach: 'ahmed', user: { ...user, suspended: true } })).toEqual({ redirect: '/suspended' });
});
