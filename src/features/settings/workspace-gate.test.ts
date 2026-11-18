import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/features/settings', () => ({ SettingsScreen: () => createElement('div', null, 'legacy-settings'),
  CaptainSettings: () => createElement('div', null, 'workspace-settings') }));
vi.mock('@/features/auth', () => ({ SignOutButton: () => null }));
vi.mock('@/features/ai-connect/server', () => ({ connectedToolsSettings: async () => null }));
afterEach(() => vi.unstubAllEnvs());
it.each(['0', undefined])('renders the legacy settings markup unchanged with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const { default: Page } = await import('@/app/[locale]/(captain)/captain/settings/page');
  expect(renderToStaticMarkup(await Page())).toBe('<div>legacy-settings</div>');
});
it('selects captain workspace settings behind the flag', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const { default: Page } = await import('@/app/[locale]/(captain)/captain/settings/page');
  expect(renderToStaticMarkup(await Page())).toBe('<div>workspace-settings</div>');
});
