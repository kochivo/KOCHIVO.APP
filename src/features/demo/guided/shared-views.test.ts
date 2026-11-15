import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainHome } from './captain-home';
import { CaptainPane } from './captain-pane';
import { PhonePane } from './phone-pane';
import { Roster } from './roster';
import { Money } from './money';
import { initialState } from './state';
import type { DemoPlan, PaneProps } from './types';

const panes: [string, ComponentType<PaneProps & { plans: readonly DemoPlan[] }>][] = [
  ['home', CaptainHome], ['captain', CaptainPane], ['phone', PhonePane], ['roster', Roster], ['money', Money],
];
it.each(panes)('keeps rendered demo links local in %s', (_name, view) => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(view, {
    state: initialState(0), now: () => 0, dispatch() {}, act() {}, plans: [],
  })));
  expect(html).not.toMatch(/href="\/(?:captain|player)(?:["/])/);
});

it.each([
  ['captain-home.tsx', 'HomeHeroView', 'HomeTilesView', 'HomeTaskListView'],
  ['captain-pane.tsx', 'CaptainFrameNavView'],
  ['workout.tsx', 'SetRowsView'],
  ['phone-pane.tsx', 'PlayerTabsView'],
  ['chat-list.tsx', 'ConversationList'],
  ['chat-messages.tsx', 'ChatThreadView', 'ConversationBubbles'],
  ['tasks.tsx', 'TaskRow'],
  ['money.tsx', 'WorkspaceBillingTiles', 'MoneyOwedView'],
  ['roster.tsx', 'RosterRowView'],
  ['food-row.tsx', 'V11FoodRowView'],
])('uses production views in %s', (file, ...views) => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  for (const view of views) expect(source).toContain(`<${view}`);
});

it.each([
  '../../dashboard/home/home-hero-view.tsx', '../../dashboard/home/home-tiles-view.tsx',
  '../../dashboard/home/home-task-list-view.tsx', '../../roster/components/captain-frame-nav-view.tsx',
  '../../roster/components/roster-row-view.tsx', '../../workout/components/set-rows-view.tsx',
  '../../player-shell/components/player-tabs-view.tsx', '../../chat/components/chat-thread-view.tsx',
  '../../meal-plans/components/v11-food-row-view.tsx', '../../captain-workspace/money-owed/money-owed-view.tsx',
])('keeps %s independent of server entries and data clients', file => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  expect(source).not.toMatch(/from ['"][^'"]*\/server['"]|server-only|use server|supabase|saveAndQueue|getT\(/);
});
