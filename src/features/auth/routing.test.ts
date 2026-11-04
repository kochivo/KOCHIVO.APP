import { describe, expect, it } from 'vitest';
import { decideRoute, homeFor } from './routing';

describe('non-admin routing', () => {
  it('lets a confirmed demo captain use captain routes', () => {
    expect(decideRoute({ path: '/captain', user: { role: 'captain', admin: false, roleConfirmed: true, anonymous: true } })).toEqual({});
  });
  const captain = { role: 'captain', admin: false, roleConfirmed: true } as const;
  const player = { role: 'player', admin: false, roleConfirmed: true } as const;
  it('blocks suspended users on all routes except suspension, sign-out and callback', () => {
    for (const user of [captain, player, { ...captain, roleConfirmed: false }]) {
      for (const path of ['/', '/captain', '/player', '/login', '/i/abc', '/reset-password', '/suspended-other', '/auth/callback-other']) {
        expect(decideRoute({ path, user: { ...user, suspended: true } })).toEqual({ redirect: '/suspended' });
      }
      for (const path of ['/suspended', '/sign-out', '/auth/sign-out', '/auth/callback']) {
        expect(decideRoute({ path, user: { ...user, suspended: true } })).toEqual({});
      }
    }
  });
  for (const path of ['/', '/i/abc', '/forgot-password', '/reset-password', '/auth/callback', '/dev/ui', '/offline']) {
    for (const user of [null, captain, player]) it(`${path} is public for ${user?.role}`, () => {
      expect(decideRoute({ path, user })).toEqual({});
    });
  }
  for (const suffix of ['', '/nested']) {
    it(`protects role areas ${suffix}`, () => {
      expect(decideRoute({ path: `/captain${suffix}`, user: null })).toEqual({ redirect: '/login' });
      expect(decideRoute({ path: `/player${suffix}`, user: null })).toEqual({ redirect: '/login' });
      expect(decideRoute({ path: `/captain${suffix}`, user: player })).toEqual({ redirect: '/player' });
      expect(decideRoute({ path: `/player${suffix}`, user: captain })).toEqual({ redirect: '/captain' });
      expect(decideRoute({ path: `/captain${suffix}`, user: captain })).toEqual({});
      expect(decideRoute({ path: `/player${suffix}`, user: player })).toEqual({});
      expect(decideRoute({ path: `/captain${suffix}`, user: { ...captain, roleConfirmed: false } })).toEqual({ redirect: '/login' });
    });
  }
  for (const path of ['/login']) it(`redirects sessions from ${path}`, () => {
    expect(decideRoute({ path, user: null })).toEqual({});
    expect(decideRoute({ path, user: captain })).toEqual({ redirect: '/captain' });
    expect(decideRoute({ path, user: player })).toEqual({ redirect: '/player' });
    expect(decideRoute({ path, user: { ...captain, roleConfirmed: false } })).toEqual({});
  });
  it('matches path segments', () => expect(decideRoute({ path: '/captain-other', user: null })).toEqual({}));
  it('allows an unconfirmed player in the player area', () => {
    expect(decideRoute({ path: '/player', user: { ...player, roleConfirmed: false } })).toEqual({});
  });
});

describe('admin-only routing', () => {
  const admin = { role: 'captain', roleConfirmed: false, admin: true } as const;
  it.each(['/captain', '/captain/settings', '/player', '/player/today', '/login'])('redirects %s to admin', path => {
    expect(decideRoute({ path, user: admin, coach: 'ahmed' })).toEqual({ redirect: '/admin' });
  });
  it('leaves the admin guard and unrelated public paths in charge', () => {
    for (const path of ['/admin', '/auth/callback', '/captain-other']) {
      expect(decideRoute({ path, user: admin })).toEqual({});
    }
  });
  it('keeps suspension ahead of admin routing', () => {
    expect(decideRoute({ path: '/captain', user: { ...admin, suspended: true } })).toEqual({ redirect: '/suspended' });
  });
  it('chooses the home from membership before role', () => {
    expect(homeFor(admin)).toBe('/admin');
    expect(homeFor({ ...admin, role: 'player' })).toBe('/admin');
    expect(homeFor({ ...admin, admin: false })).toBe('/captain');
    expect(homeFor({ ...admin, admin: false, role: 'player' })).toBe('/player');
  });
});
