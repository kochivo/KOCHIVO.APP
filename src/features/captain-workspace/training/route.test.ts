import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import Page from '@/app/[locale]/(captain)/captain/players/[playerId]/programs/page';
import { ProgramBuilder } from '@/features/programs';
import { GenerateButton } from '@/features/program-generator';
import { TrainingEntry } from '../server';

vi.mock('@/features/programs', () => ({ ProgramBuilder: () => createElement('div', null, 'builder'), programMessages: {} }));
vi.mock('@/features/program-generator', () => ({ GenerateButton: () => createElement('div', null, 'generate') }));
vi.mock('@/features/player-profile', () => ({ fetchPlayerProfile: async () => ({ data: { name: 'Ali', intake: null } }) }));
vi.mock('../server', () => ({ TrainingEntry: () => createElement('section', null, 'training') }));
afterEach(() => vi.unstubAllEnvs());
const params = Promise.resolve({ playerId: 'p', locale: 'ar' });
it.each([undefined, '0', 'true'])('retains byte-identical flag-off training for %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const previous = createElement('div', { className: 'space-y-6' },
    createElement('div', { className: 'mx-auto max-w-5xl' }, createElement(GenerateButton, {
      key: 'p-true', playerId: 'p', profileError: false, playerName: 'Ali', intake: null,
    })), createElement(ProgramBuilder, { key: 'p', playerId: 'p' }));
  const actual = await Page({ params });
  expect(actual).toEqual(previous);
  expect(renderToStaticMarkup(actual)).toBe(renderToStaticMarkup(previous));
});
it('uses the new training entry only when enabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect((await Page({ params })).type).toBe(TrainingEntry);
});
it('retains the forms arrival redirect', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  await expect(Page({ params, searchParams: Promise.resolve({ view: 'forms' }) })).rejects.toMatchObject({
    digest: expect.stringContaining('/captain/players/p/assessments'),
  });
});
