import { expect, it } from 'vitest';
import manifest from '@/app/manifest';
import { isInstalledApp } from './components/installed-app-redirect';

const win = (standaloneQuery: boolean, standalone?: boolean) => ({
  matchMedia: () => ({ matches: standaloneQuery }) as unknown as MediaQueryList,
  navigator: { standalone } as Navigator & { standalone?: boolean },
});

it('detects the installed app on Android and iOS but not in a browser tab', () => {
  expect(isInstalledApp(win(true))).toBe(true);
  expect(isInstalledApp(win(false, true))).toBe(true);
  expect(isInstalledApp(win(false))).toBe(false);
});

it('starts the installed app at login, which forwards signed-in users home', () => {
  expect(manifest().start_url).toBe('/login');
});
