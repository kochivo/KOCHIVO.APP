import { afterEach, expect, it, vi } from 'vitest';
import { captainMobileNav, captainNav, captainLinks } from './nav';

afterEach(() => vi.unstubAllEnvs());
it('leaves the flag-off navigation unchanged', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(captainNav('/captain').map(item => item.href)).toEqual(captainLinks.map(item => item.href));
  expect(captainMobileNav('/captain').map(item => item.href)).toEqual([
    '/captain', '/captain/players', '/captain/templates', '/captain/inbox',
  ]);
});
it('includes foods and forms under the enabled library on desktop and phone', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(captainNav('/captain/library/foods').filter(item => item.href.includes('/library')).map(item => item.href))
    .toEqual(['/captain/library/foods', '/captain/library/forms']);
  expect(captainMobileNav('/captain/library/foods').some(item => item.href === '/captain/library/foods')).toBe(true);
});
