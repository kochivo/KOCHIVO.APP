import { expect, it } from 'vitest';
import { isInstalledApp, shouldWelcome, inviteDestination, welcomeAction } from './welcome-navigation';

it('recognizes standalone and iOS installs without redirecting browsers', () => {
  for (const [matches, standalone, expected] of [[true, false, true], [false, true, true], [false, false, false]] as const) {
    const win = { matchMedia: () => ({ matches }), navigator: { standalone } };
    expect(isInstalledApp(win)).toBe(expected);
    expect(shouldWelcome(win, '')).toBe(expected);
    for (const search of ['?tab=', '?tab=login', '?coach=ali', '?error=']) expect(shouldWelcome(win, search)).toBe(false);
  }
});

it('extracts invite codes and rejects junk', () => {
  expect(inviteDestination(' Ab_c-12 ')).toBe('/i/Ab_c-12');
  expect(inviteDestination('https://kochivo.app/i/Ab_c-12?from=coach')).toBe('/i/Ab_c-12');
  for (const value of ['', 'not a code!', 'https://example.com/foo', 'https://example.com/i/a/b']) expect(inviteDestination(value)).toBeNull();
});

it('routes each primary action to its next step or destination', () => {
  expect(welcomeAction('start')).toBe(2);
  expect(welcomeAction('player')).toBe(3);
  expect(welcomeAction('captain')).toBe('/login?tab=signup');
  expect(welcomeAction('login')).toBe('/login?tab=login');
});
