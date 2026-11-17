import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { Segmented } from '@/ui/segmented';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import type { BillingPlayer } from '../types';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => {
  const index = state.cursor++;
  if (!(index in state.slots)) state.slots[index] = initial;
  return [state.slots[index], (next: unknown) => { state.slots[index] = next; }];
} }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Messages) => createT(messages, 'en') }));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('@/ui/page-bar-actions', () => ({ PageBarActions: ({ children }: { children: React.ReactNode }) => children }));

const base: BillingPlayer = { playerId: 'active', fullName: 'Active player', accessUntil: '2026-12-20', due: 0,
  phone: null, lastPayment: null, startedOn: '2026-11-01', lastTrainingDate: null, programTitle: null,
  openTasks: 0, status: 'active' };
const players = [base, { ...base, playerId: 'late', fullName: 'Late player', due: 100 },
  { ...base, playerId: 'soon', fullName: 'Ending player', accessUntil: '2026-11-20' },
  { ...base, playerId: 'pending', fullName: 'Pending player', pending: true }];
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render(rows = players) {
  state.cursor = 0;
  return WorkspacePaymentsTable({ players: rows, packages: [], today: '2026-11-17' });
}
function filter(value: string) {
  const onChange = nodes(render()).find(node => node.type === Segmented)?.props.onChange;
  if (typeof onChange !== 'function') throw new Error('Missing filter');
  onChange(value);
}
beforeEach(() => { state.slots = []; state.cursor = 0; });

it.each([['paid', 'Active player'], ['overdue', 'Late player'], ['ending', 'Ending player']] as const)(
  'uses the existing %s subscription category without including waiting players', (category, name) => {
    filter(category);
    const html = renderToStaticMarkup(render());
    expect(html).toContain(name);
    for (const other of players.filter(row => row.fullName !== name)) expect(html).not.toContain(other.fullName);
    filter('all');
    expect(renderToStaticMarkup(render())).toContain('Pending player');
  },
);
it('shows filter recovery when the selected category has no matches', () => {
  filter('overdue');
  const html = renderToStaticMarkup(render([base]));
  expect(html).toContain('No players match');
  expect(html).toContain('role="radiogroup"');
});
it('keeps recording and row actions secondary alongside the unchanged receipt action', () => {
  const html = renderToStaticMarkup(render());
  expect(html).not.toContain('control-primary');
  expect(html).toContain('Record payment');
  const rows = html.slice(html.indexOf('<tbody'));
  expect(rows).toContain('control-secondary');
});
