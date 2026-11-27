import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerSupplements } from './components/player-supplements';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));
vi.mock('./hooks/use-supplement-player', () => ({ useSupplementPlayer: () => 'player' }));
vi.mock('@/core/offline', () => ({ useLiveQuery: () => ({ playerId: 'player', supplements: [], logs: [] }) }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => initial === true ? [false, () => {}] : react.useState(initial) };
});

it('omits the optional nutrition section when the player has no assigned supplements', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(PlayerSupplements)));
  expect(html).toBe('');
});
