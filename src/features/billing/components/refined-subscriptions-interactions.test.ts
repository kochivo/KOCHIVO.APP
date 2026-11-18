import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import { WorkspaceBillingPaymentRow } from './workspace-billing-payment-row';
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
const payment = { id: 'pay', captain_id: 'captain', player_id: 'p', period_start: '2026-11-01', period_end: '2026-11-20',
  days: 30, price_egp: 100, amount_egp: 100, created_at: '2026-11-01T12:00:00Z' };
const players = [{ ...base, lastPayment: payment }, { ...base, playerId: 'late', fullName: 'Late player', due: 100,
  lastPayment: { ...payment, amount_egp: 0 } },
  { ...base, playerId: 'soon', fullName: 'Ending player', accessUntil: '2026-11-20', lastPayment: { ...payment, amount_egp: 25 }, due: 75 },
  { ...base, playerId: 'pending', fullName: 'Pending player', pending: true }];
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render(rows: BillingPlayer[] = players) {
  state.cursor = 0;
  return WorkspacePaymentsTable({ players: rows, packages: [], today: '2026-11-17' });
}
function filter(value: string) {
  const onClick = nodes(render()).find(node => node.key === value)?.props.onClick;
  if (typeof onClick !== 'function') throw new Error('Missing filter');
  onClick();
}
beforeEach(() => { state.slots = []; state.cursor = 0; });

it.each([['paid', ['Active player']], ['overdue', ['Late player', 'Ending player']],
  ['ending', ['Ending player']], ['noPackage', ['Pending player']]] as const)(
  'filters by %s while keeping the other filters available', (category, names) => {
    filter(category);
    const html = renderToStaticMarkup(render());
    expect(html.match(/aria-pressed=/g)).toHaveLength(5);
    for (const player of players) expect(html.includes(player.fullName)).toBe(names.some(name => name === player.fullName));
    filter('all');
    expect(renderToStaticMarkup(render())).toContain('Pending player');
  },
);
it('shows filter recovery when the selected category has no matches', () => {
  filter('overdue');
  const html = renderToStaticMarkup(render([base]));
  expect(html).toContain('No players match');
  expect(html).toContain('role="group"');
});
it('combines the player search with the current filter', () => {
  filter('overdue');
  const onChange = nodes(render()).find(node => node.type === 'input')?.props.onChange;
  if (typeof onChange !== 'function') throw new Error('Missing search');
  onChange({ target: { value: '  ENDING  ' } });
  const html = renderToStaticMarkup(render());
  expect(html).toContain('Ending player');
  expect(html).not.toContain('Late player');
});
it('keeps the header action primary and exactly one secondary action per row', () => {
  const html = renderToStaticMarkup(render());
  expect(html.match(/control-primary/g)).toHaveLength(1);
  expect(html).toContain('Record payment');
  const rows = html.slice(html.indexOf('<tbody'));
  expect(rows.match(/<button/g)).toHaveLength(players.length);
  expect(rows.match(/control-secondary/g)).toHaveLength(players.length);
});

it.each([['active', 'history'], ['late', 'collect'], ['pending', 'activate']] as const)(
  'opens the existing %s player flow with the %s action', (id, action) => {
    const onOpen = nodes(render()).find(node => node.type === WorkspaceBillingPaymentRow && node.key === id)?.props.onOpen;
    if (typeof onOpen !== 'function') throw new Error('Missing row action');
    onOpen();
    expect(nodes(render()).some(node => node.props.initialAction === action)).toBe(true);
  },
);
