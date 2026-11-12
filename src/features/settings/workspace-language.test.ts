import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type { SettingsProfile } from './schema';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock('./data/language', () => ({ saveLanguage: async () => ({}) }));
vi.mock('./data/preferences', () => ({ saveCaptainPreferences: async () => ({}) }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function chips(international: string) {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', international);
  const { WorkspacePreferences } = await import('./components/workspace-preferences');
  const profile = { timezone: null, timezone_auto: true, units: 'metric' } as unknown as SettingsProfile;
  return renderToStaticMarkup(createElement(WorkspacePreferences, { profile, update: () => {} }));
}

it('keeps Arabic and English, without standard Arabic, when the international flag is off', async () => {
  const html = await chips('0');
  expect(html).toContain('>English<');
  expect(html).not.toContain('عربي فصحى');
});

it('offers Egyptian, standard Arabic and English when the international flag is on', async () => {
  const html = await chips('1');
  expect(html).toContain('عربي مصري');
  expect(html).toContain('عربي فصحى');
  expect(html).toContain('>English<');
});
