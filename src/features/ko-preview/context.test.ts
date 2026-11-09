import { expect, it } from 'vitest';
import { contextFromPath } from './context';
import { suggestionsFor } from './suggestions';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { KoChat } from './components/ko-chat';

it.each(['ar', 'en'])('derives context only from route segments (%s)', locale => {
  expect(contextFromPath(`/${locale}/captain/players/p1/programs`)).toEqual({ screen: 'player', playerId: 'p1' });
  expect(contextFromPath(`/${locale}/captain/programs/pr1`)).toEqual({ screen: 'program', programId: 'pr1' });
  expect(contextFromPath(`/${locale}/captain/inbox`)).toEqual({ screen: 'inbox' });
  expect(contextFromPath(`/${locale}/player/nutrition`)).toEqual({ screen: 'nutrition' });
  expect(contextFromPath(`/${locale}/unknown`)).toEqual({ screen: 'home' });
});

it.each(['ar', 'en'] as const)('renders translated accessible chips using logical spacing (%s)', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoChat, { role: 'player' })));
  expect(html).toContain(locale === 'en' ? 'My next meal' : 'وجبتي الجاية');
  expect(html).toContain('role="group"');
  expect(html).toContain('min-h-12');
  expect(html).not.toMatch(/(?:ml-|mr-|pl-|pr-|text-left)/);
});

it.each([
  '/captain', '/captain/players', '/captain/templates', '/captain/billing', '/captain/settings', '/captain/pending',
  '/player', '/player/captain', '/player/history', '/player/onboarding', '/player/progress', '/player/settings', '/player/workout/day',
  '/captain/players/id/unknown', '/captain/inbox/unknown',
])('uses home for routes without a dedicated context: %s', path => {
  expect(contextFromPath(path)).toEqual({ screen: 'home' });
});

it.each(['', '/nutrition', '/programs', '/preview'])('keeps the player target for player subpages: %s', tab => {
  expect(contextFromPath(`/en/captain/players/id${tab}`)).toEqual({ screen: 'player', playerId: 'id' });
});

it('offers role-specific message keys and hides them once a message exists', () => {
  expect(suggestionsFor('captain', { screen: 'home' })).toEqual(['suggest.today']);
  expect(suggestionsFor('player', { screen: 'home' })).toEqual(['suggest.meal']);
  expect(suggestionsFor('captain', { screen: 'player', playerId: 'p1' }, true)).toEqual([]);
});
