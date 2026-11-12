import { isValidElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { ProgramDraft } from '@/features/programs';
import { WeekMenu } from './week-menu';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ values: [] as boolean[], cursor: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: boolean) => {
  const index = state.cursor++;
  if (!(index in state.values)) state.values[index] = initial;
  return [state.values[index], (value: boolean) => { state.values[index] = value; }];
} }));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
function nodes(value: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
const draft: ProgramDraft = { id: 'p', title: 'Plan', status: 'draft', player_id: 'player', days: [{
  id: 'd', program_id: 'p', title: 'Push', position: 1, warmup: { items: [], ramp: false }, exercises: [],
}] };
beforeEach(() => { state.values = []; state.cursor = 0; });
it('requires a fresh destructive confirmation after closing and reopening the menu', () => {
  const render = () => { state.cursor = 0; return nodes(WeekMenu({ draft, day: draft.days[0], update: vi.fn() })); };
  const click = (label: string) => { const button = render().find(node => node.props.children === label); (button?.props.onClick as () => void)(); };
  const open = render().find(node => node.props.id === 'week-menu'); (open?.props.onClick as () => void)();
  click('شيل اليوم');
  expect(render().some(node => node.props.role === 'alert')).toBe(true);
  click('إغلاق');
  const reopen = render().find(node => node.props.id === 'week-menu'); (reopen?.props.onClick as () => void)();
  expect(render().some(node => node.props.role === 'alert')).toBe(false);
});
