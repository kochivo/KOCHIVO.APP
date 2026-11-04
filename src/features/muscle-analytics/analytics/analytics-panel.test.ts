import { createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { weeklyVolume } from '../data/muscle-volume';
import { AnalyticsPanel } from '../components/analytics-panel';
import { WeekSlider } from '../components/week-slider';

const state = vi.hoisted(() => ({ week: 4 }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof React>(),
  useId: () => 'analytics-week',
  useState: () => [state.week, (value: number) => { state.week = value; }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
beforeEach(() => { state.week = 4; });
const now = new Date('2026-11-04T10:00:00Z');
function weeks(count = 21) {
  return weeklyVolume(Array.from({ length: count }, () => ({
    completed_at: '2026-11-02T10:00:00Z', deleted_at: null, reps: 8,
    exercises: { target: 'pectorals', body_part: 'chest' },
  })), now);
}
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
it('shows a fatigue marker and accessible high-load row only above 20 sets', () => {
  const high = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks() }));
  expect(high).toContain('data-fatigue="chest"');
  expect(high).toContain('High load on chest');
  expect(high).toContain('motion-reduce:animate-none');
  const normal = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(20) }));
  expect(normal).not.toContain('data-fatigue=');
  expect(normal).not.toContain('High load on');
});
it('changes fills, balance and fatigue through the range input without fetching', () => {
  const data = weeks();
  const before = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(before).toContain('data-region="chest" class="fill-lime shadow-lime-glow');
  expect(before).toContain('Push/pull imbalance');
  const slider = nodes(AnalyticsPanel({ weeks: data })).find(node => node.type === WeekSlider);
  const input = nodes(WeekSlider(slider?.props as Parameters<typeof WeekSlider>[0])).find(node => node.type === 'input');
  (input?.props.onChange as (event: unknown) => void)({ currentTarget: { value: '1' } });
  const after = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(after).toContain('data-region="chest" class="fill-none');
  expect(after).toContain('No workout this week');
  expect(after).not.toContain('data-fatigue=');
  expect(after).not.toContain('Push/pull imbalance');
});
it('shows the overall empty state when all four weeks have no sets', () => {
  const html = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(0) }));
  expect(html).toContain("The player hasn&#x27;t logged any workouts yet");
});
it('speaks to the player on their own progress page', () => {
  const html = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(0), self: true }));
  expect(html).toContain('Log your first workout to see your muscle volume');
});
