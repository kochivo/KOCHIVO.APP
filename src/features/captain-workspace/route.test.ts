import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import PlayerProgramsPage from '@/app/[locale]/(captain)/captain/players/[playerId]/programs/page';
import { ProgramBuilder } from '@/features/programs';
import { GenerateButton } from '@/features/program-generator';
import { WorkspaceEntry } from './index';

vi.mock('@/features/programs', () => ({ ProgramBuilder: () => createElement('div', null, 'builder'), programMessages: {} }));
vi.mock('@/features/program-generator', () => ({ GenerateButton: () => createElement('div', null, 'generator') }));
vi.mock('@/features/player-profile', () => ({ fetchPlayerProfile: async () => ({ data: { name: 'Ahmed', intake: null } }) }));
vi.mock('./index', () => ({ WorkspaceEntry: () => createElement('section', null, 'workspace') }));
afterEach(() => vi.unstubAllEnvs());
const params = Promise.resolve({ playerId: 'player', locale: 'en' });

it.each([undefined, '', '0', 'true'])('keeps the exact legacy component tree with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const tree = await PlayerProgramsPage({ params });
  const legacy = createElement('div', { className: 'space-y-6' },
    createElement('div', { className: 'mx-auto max-w-5xl' }, createElement(GenerateButton, {
      key: 'player-true', playerId: 'player', profileError: false, playerName: 'Ahmed', intake: null,
    })), createElement(ProgramBuilder, { key: 'player', playerId: 'player' }));
  expect(tree).toEqual(legacy);
  expect(renderToStaticMarkup(tree)).toBe(renderToStaticMarkup(legacy));
});
it('selects the workspace entry when the flag is on', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const tree = await PlayerProgramsPage({ params });
  expect(tree.type).toBe(WorkspaceEntry);
  expect(tree.props).toEqual({ playerId: 'player' });
});
