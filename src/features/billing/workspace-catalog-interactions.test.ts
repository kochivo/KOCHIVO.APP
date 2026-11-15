import { Button } from '@/ui/button';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { WorkspaceCatalog } from './components/workspace-catalog';
import { WorkspaceTierCard } from './components/workspace-tier-card';
import { WorkspaceOffersCard } from './components/workspace-offers-card';
import { UnassignedPackages } from './tiers/unassigned-packages';
import { catalogFixture } from './tiers/catalog-fixture';
import type { Catalog } from './tiers/types';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, data: undefined as Catalog | undefined,
  status: 'ready', retry: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => {
  const index = state.cursor++;
  if (!(index in state.slots)) state.slots[index] = typeof initial === 'function' ? initial() : initial;
  return [state.slots[index], (next: unknown) => { state.slots[index] = typeof next === 'function' ? next(state.slots[index]) : next; }];
} }));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Messages) => createT(messages, 'en') }));
vi.mock('./tiers/use-catalog', () => ({ useCatalog: () => ({ data: state.data, busy: false, error: '', status: state.status, retry: state.retry }) }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-28T12:00:00Z') }) }));

type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() { state.cursor = 0; return nodes(WorkspaceCatalog()); }
function invoke(node: Node | undefined, prop: string, ...args: unknown[]) {
  const callback = node?.props[prop];
  if (typeof callback !== 'function') throw new Error(`Missing ${prop}`);
  callback(...args);
}
function editor() {
  const node = render().find(node => node.props.catalog && node.props.onClose);
  if (!node) throw new Error('Editor not opened');
  return node;
}
beforeEach(() => { state.slots = []; state.data = catalogFixture; state.status = 'ready'; vi.clearAllMocks(); });
it('opens and closes the existing tier editor from New package', () => {
  invoke(render().find(node => (node.type === 'button' || node.type === Button) && nodes(node.props.children).length > 0), 'onClick');
  const panel = editor();
  expect(panel.props.tier).toBeUndefined();
  invoke(panel, 'onClose');
  expect(render().some(node => node.props.catalog && node.props.onClose)).toBe(false);
});
it('passes the selected tier to its editor', () => {
  invoke(render().find(node => node.type === WorkspaceTierCard), 'onEdit');
  expect(editor().props.tier).toBe(catalogFixture.tiers[0]);
});
it('opens both new and existing durations under their tier', () => {
  const card = render().find(node => node.type === WorkspaceTierCard);
  invoke(card, 'onPackage');
  expect(editor().props.tierId).toBe('vip');
  expect(editor().props.item).toBeUndefined();
  invoke(editor(), 'onClose');
  invoke(card, 'onPackage', catalogFixture.packages[0]);
  expect(editor().props.item).toBe(catalogFixture.packages[0]);
});
it('keeps unassigned packages editable', () => {
  const source = catalogFixture.packages[0];
  if (!source) throw new Error('Missing package fixture');
  const item = { ...source, tier_id: null };
  state.data = { ...catalogFixture, packages: [item] };
  invoke(render().find(node => node.type === UnassignedPackages), 'onEdit', item);
  expect(editor().props.item).toBe(item);
});
it('opens new offers and passes selected offers to the existing editor', () => {
  const card = render().find(node => node.type === WorkspaceOffersCard);
  invoke(card, 'onNew');
  expect(editor().props.offer).toBeUndefined();
  expect(editor().props.now).toEqual(new Date('2026-11-28T12:00:00Z'));
  invoke(editor(), 'onClose');
  invoke(card, 'onEdit', catalogFixture.offers[0]);
  expect(editor().props.offer).toBe(catalogFixture.offers[0]);
});
it('retries catalog errors without opening an editor', () => {
  state.data = undefined; state.status = 'error';
  invoke(render()[0], 'onRetry');
  expect(state.retry).toHaveBeenCalledOnce();
});
