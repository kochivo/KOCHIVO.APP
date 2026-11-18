import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlayerProgramSummary } from './player-program-summary';
import { ProgramPrescriptionRow } from './program-prescription-row';
import type { ProgramSummary } from './player-program-model';

const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[] }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof React>(),
  useState: <T,>(initial: T) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index] as T, (next: T) => { state.values[index] = next; }];
  },
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
const row = { id: 'first-row', sets: 3, reps_min: 8, reps_max: 8, rest_seconds: 90, library: null };
const program: ProgramSummary = { id: 'plan', title: 'Plan', startedOn: null, totalWeeks: null, days: [
  { id: 'first', title: 'First', position: 1, rest: false, exercises: [row] },
  { id: 'second', title: 'Second', position: 2, rest: false, exercises: [{ ...row, id: 'second-row' }] },
] };
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() {
  state.cursor = 0;
  return nodes(PlayerProgramSummary({ playerId: 'player', program, today: '2026-11-14', locale: 'en' }));
}
beforeEach(() => { state.values = []; state.cursor = 0; });
it('filters prescription rows when a day is selected', () => {
  let tree = render();
  expect(tree.find(node => node.type === ProgramPrescriptionRow)?.props.row).toMatchObject({ id: 'first-row' });
  const second = tree.find(node => node.props.id === 'program-tab-second');
  (second?.props.onClick as () => void)();
  tree = render();
  expect(tree.find(node => node.type === ProgramPrescriptionRow)?.props.row).toMatchObject({ id: 'second-row' });
  expect(tree.find(node => node.props.id === 'program-tab-second')?.props['aria-pressed']).toBe(true);
  expect(tree.find(node => node.props.id === 'program-tab-first')?.props['aria-pressed']).toBe(false);
});
it('mounts the existing start flow only after the change action', () => {
  let tree = render();
  expect(tree.some(node => node.props.templatesInitially === true)).toBe(false);
  const change = tree.find(node => node.props.id === 'player-program-change');
  (change?.props.onClick as () => void)();
  tree = render();
  expect(tree.find(node => node.props.templatesInitially === true)?.props.playerId).toBe('player');
});
