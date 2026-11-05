import { createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { weeklyVolume } from '../data/muscle-volume';
import { AnalyticsPanel } from '../components/analytics-panel';
import { WeekSlider } from '../components/week-slider';
import { BodyMap } from '../components/body-map';

const state = vi.hoisted(() => ({ week: 4 }));
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof React>();
  return { ...react, useId: () => 'analytics-week',
    useState: (initial: unknown) => initial === 4 ? [state.week, (value: number) => { state.week = value; }] : react.useState(initial),
  };
});
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: Messages) => createT(dictionary, 'en'), useLocale: () => 'en' }));
beforeEach(() => { state.week = 4; });
it('lights only trained regions and never renders chest on the back', () => {
  const html = renderToStaticMarkup(createElement(BodyMap, {
    volume: { chest: 3, arms: 3, back: 0, shoulders: 0, abs: 0, legs: 0 },
  }));
  const figures = html.split('<figure').slice(1);
  const active = (figure: string) => [...figure.matchAll(/<g[^>]*data-region="([^"]+)"[^>]*class="([^"]*)"/g)]
    .filter(match => match[2]?.includes('text-lime')).map(match => match[1]);
  expect(active(figures[0] ?? '')).toEqual(['chest', 'arms']);
  expect(active(figures[1] ?? '')).toEqual(['arms']);
  expect(figures[1]).not.toContain('data-region="chest"');
  expect(html).toContain('stroke-bg-deep/40');
  expect(html).toMatch(/<figcaption[^>]*class="[^"]*glass/);
});
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
  expect(before).toContain('data-region="chest"');
  expect(before).toContain('fill="url(#analytics-week-front-chest)"');
  expect(before).toContain('Pull, Legs: under 25%');
  const slider = nodes(AnalyticsPanel({ weeks: data })).find(node => node.type === WeekSlider);
  const input = nodes(WeekSlider(slider?.props as Parameters<typeof WeekSlider>[0])).find(node => node.type === 'input');
  (input?.props.onChange as (event: unknown) => void)({ currentTarget: { value: '1' } });
  const after = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(after).toContain('fill="currentColor"');
  expect(after).toContain('No workout this week');
  expect(after).not.toContain('data-fatigue=');
  expect(after).not.toContain('under 25%');
});
it('renders three named stats, three named balance segments and real muscle buttons in both views', () => {
  for (const self of [false, true]) {
    const html = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(12), self, readiness: 60 }));
    expect(html).toContain('<dt');
    expect(html).toContain('Weekly sets');
    expect(html).toContain('Most worked muscle');
    expect(html).toContain('Recovery');
    expect(html).toContain('Average');
    for (const [group, value] of [['Push', 100], ['Pull', 0], ['Legs', 0]]) {
      expect(html).toContain(`role="img" aria-label="${group}: ${value}%"`);
    }
    expect(html).toContain('aria-label="chest: 12 sets"');
    expect(html.match(/<button /g)).toHaveLength(6);
    expect(html).not.toContain('role="button"');
    expect(html).toContain('feGaussianBlur');
  }
});
it('shows the overall empty state when all four weeks have no sets', () => {
  const html = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(0) }));
  expect(html).toContain("The player hasn&#x27;t logged any workouts yet");
});
it('speaks to the player on their own progress page', () => {
  const html = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(0), self: true }));
  expect(html).toContain('Log your first workout to see your muscle volume');
});
