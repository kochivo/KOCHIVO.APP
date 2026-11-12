import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { emptyWarmup } from '@/features/programs';
import { weekCells } from './week-cells';
import { WeekStrip } from './components/week-strip';

vi.mock('server-only', () => ({}));
const day = (id: string, position: number, weekday?: number): DraftDay => ({
  id, program_id: 'p', title: id, position, weekday, exercises: [], warmup: emptyWarmup(),
});
const program = (days: DraftDay[]): ProgramDraft => ({ id: 'p', player_id: 'player', title: 'Plan', status: 'active', days });

it('maps weekly days by Saturday-first weekday, including missing and explicit rest days', () => {
  const cells = weekCells(program([day('fri', 1, 6), { ...day('sat', 2, 0), is_rest_day: true }, day('tue', 3, 3)]));
  expect(cells.map(cell => cell.day?.id)).toEqual(['sat', undefined, undefined, 'tue', undefined, undefined, 'fri']);
  expect(cells.map(cell => cell.rest)).toEqual([true, true, true, false, true, true, false]);
});
it('keeps rotation days in position order without inventing a seven-day week', () => {
  expect(weekCells(program([day('second', 2), day('first', 1)])).map(cell => cell.day?.id)).toEqual(['first', 'second']);
  expect(weekCells(program([]))).toEqual([]);
});
it('renders shared set/minute estimates, rest labels and the selected underline', () => {
  const training = { ...day('sat', 1, 0), exercises: [{ id: 'e', day_id: 'sat', exercise_id: 'x', position: 1,
    sets: 4, reps_min: 8, reps_max: 10, rest_seconds: 60, rir: null, superset_group: null, library: null }] };
  const html = renderToStaticMarkup(createElement(WeekStrip, {
    cells: weekCells(program([training])), selectedId: 'sat', locale: 'en', onSelect() {},
  }));
  expect(html).toContain('4 sets');
  expect(html).toContain('5 min');
  expect(html).toContain('Rest');
  expect(html).toMatch(/aria-pressed="true"[^>]*class="[^"]*border-b-lime/);
  expect(html.match(/<button/g)).toHaveLength(7);
});
