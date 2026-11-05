import { expect, it } from 'vitest';
import { decideRoute, homeFor } from './routing';

const captain = { role: 'captain', roleConfirmed: true, admin: false } as const;
it.each(['pending', 'rejected'] as const)('routes %s captains to approval and keeps that route available', captainStatus => {
  const user = { ...captain, captainStatus };
  expect(homeFor(user)).toBe('/captain/pending');
  expect(decideRoute({ path: '/captain/players/123', user })).toEqual({ redirect: '/captain/pending' });
  expect(decideRoute({ path: '/captain/pending', user })).toEqual({});
});
it('routes approved captains home and preserves admin priority and suspension', () => {
  expect(homeFor({ ...captain, captainStatus: 'approved' })).toBe('/captain');
  expect(homeFor({ ...captain, captainStatus: 'pending', admin: true })).toBe('/admin');
  expect(decideRoute({ path: '/captain/pending', user: { ...captain, captainStatus: 'approved' } })).toEqual({ redirect: '/captain' });
  expect(decideRoute({ path: '/captain/pending', user: { ...captain, captainStatus: 'pending', suspended: true } }))
    .toEqual({ redirect: '/suspended' });
});
