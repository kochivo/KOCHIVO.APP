import { createElement, isValidElement, Suspense } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { WorkspaceViews } from './workspace-views';
import { FormsEntry } from './forms-entry';
import { FormsScreen } from './forms-screen';

const actions = vi.hoisted(() => ({ reviewItem: vi.fn(), mediaUrls: vi.fn(), search: 'view=forms' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(actions.search) }));
vi.mock('@/features/inbox', () => ({ reviewItem: actions.reviewItem, mediaUrls: actions.mediaUrls }));
vi.mock('./forms-screen', () => ({ FormsScreen: () => createElement('section') }));
beforeEach(() => { actions.search = 'view=forms'; });

it('selects Forms for the existing query parameter and drops the training controls', () => {
  const tree = WorkspaceViews({ playerId: 'player', name: 'Ahmed', locale: 'en', children: createElement('div', null, 'training content') });
  const children = tree.props.children as ReactElement[];
  const content = children[1];
  expect(content?.type).toBe(Suspense);
  const entry = (content?.props as { children: ReactElement<{ playerId: string }> }).children;
  expect(entry.props.playerId).toBe('player');
  expect(renderToStaticMarkup(tree)).not.toContain('training content');
});
it.each(['', 'view=training', 'view=unknown'])('preserves training for query %s', query => {
  actions.search = query;
  const tree = WorkspaceViews({ playerId: 'player', name: 'Ahmed', locale: 'en', children: createElement('div', null, 'training content') });
  expect(renderToStaticMarkup(tree)).toContain('training content');
});
it('binds the existing public review and signing actions', () => {
  const tree = FormsEntry({ playerId: 'player', locale: 'en' });
  expect(isValidElement(tree)).toBe(true);
  expect(tree.type).toBe(FormsScreen);
  expect(tree.props).toEqual({ playerId: 'player', locale: 'en', review: actions.reviewItem, sign: actions.mediaUrls });
});
