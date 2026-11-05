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
import { QuickStats } from '../components/quick-stats';
import { BodyFigure } from '../components/body-figure';

const state = vi.hoisted(() => ({ week: 4 }));
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof React>();
  return { ...react, useId: () => 'analytics-week',
    useState: (initial: unknown) => initial === 4 ? [state.week, (value: number) => { state.week = value; }] : react.useState(initial),
  };
});
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: Messages) => createT(dictionary, 'en'), useLocale: () => 'en' }));
beforeEach(() => { state.week = 4; });
it('colors each muscle independently, removes captions and shows the five-step scale', () => {
  const html = renderToStaticMarkup(createElement(BodyMap, {
    volume: { chest: 3, arms: 3, back: 0, shoulders: 0, abs: 0, legs: 0 },
    muscles: { chest: 1, biceps: 4, quads: 8, glutes: 21 }, total: 34,
  }));
  const figures = html.split('<figure').slice(1);
  for (const [muscle, fill] of [['chest', 'fill-lime/25'], ['biceps', 'fill-lime/45'],
    ['quads', 'fill-lime/70'], ['glutes', 'fill-lime'], ['calves', 'fill-line']]) {
    expect(html).toMatch(new RegExp(`data-muscle="${muscle}"[^>]*class="[^"]*${fill}`));
  }
  expect(figures[1]).not.toContain('data-muscle="chest"');
  expect(html).toContain('stroke-bg-deep/40');
  expect(html).not.toContain('<figcaption');
  expect(html).not.toContain('قدّام');
  expect(html).not.toContain('ورا');
  expect(html).toContain('data-heat-scale');
  expect(html).toContain('rtl:rotate-180');
  expect(html).toContain('Less');
  expect(html).toContain('More');
  expect(html).toContain('34 sets');
  expect(html).toMatch(/data-muscle="glutes"[^>]*class="[^"]*stroke-danger/);
  expect(html).not.toContain('data-fatigue');
  expect(html).not.toContain('linearGradient');
  expect(html).toMatch(/data-muscle="glutes"[^>]*filter="url/);
  expect(html).not.toMatch(/data-muscle="biceps"[^>]*filter=/);
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
it('outlines overloaded muscles and names them only above 20 sets', () => {
  const high = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks() }));
  expect(high).toMatch(/data-muscle="chest"[^>]*class="[^"]*stroke-danger/);
  expect(high).toContain('High load on chest');
  expect(high).not.toContain('data-fatigue');
  expect(high).toContain('motion-reduce:transition-none');
  const normal = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: weeks(20) }));
  expect(normal).not.toContain('stroke-danger');
  expect(normal).not.toContain('High load on');
});
it('changes fills, balance and fatigue through the range input without fetching', () => {
  const data = weeks();
  const before = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(before).toContain('data-muscle="chest"');
  expect(before).toMatch(/data-muscle="chest"[^>]*class="[^"]*fill-lime/);
  expect(before).toContain('Pull, Legs: under 25%');
  const slider = nodes(AnalyticsPanel({ weeks: data })).find(node => node.type === WeekSlider);
  const input = nodes(WeekSlider(slider?.props as Parameters<typeof WeekSlider>[0])).find(node => node.type === 'input');
  (input?.props.onChange as (event: unknown) => void)({ currentTarget: { value: '1' } });
  const after = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(after).toMatch(/data-muscle="chest"[^>]*class="[^"]*fill-line/);
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

it('keeps quick-stat words whole at mobile size', () => {
  const week = weeks(12)[3];
  if (!week) throw new Error('Expected the current week');
  const html = renderToStaticMarkup(createElement(QuickStats, {
    week: { ...week, muscles: { glutes: 12 } }, readiness: null,
  }));
  expect(html).toContain('break-normal hyphens-none text-balance');
  expect(html).toContain('text-base');
  expect(html).toContain('md:text-2xl');
  expect(html).not.toContain('break-words');
});

it('selects the tapped muscle and keeps region overload separate from muscle overload', () => {
  const select = vi.fn();
  const figure = BodyFigure({ view: 'back', id: 'test', label: 'Back', volume: { hamstrings: 8 }, select });
  const hamstrings = nodes(figure).find(node => node.props['data-muscle'] === 'hamstrings');
  (hamstrings?.props.onClick as (event: unknown) => void)({ clientX: 100, clientY: 200 });
  expect(select).toHaveBeenCalledWith('hamstrings', 100, 200);
  const data = weeks();
  const week = data[3];
  if (!week) throw new Error('Expected the current week');
  week.regions = { ...week.regions, chest: 0, legs: 30 };
  week.muscles = { quads: 15, calves: 15 };
  const normal = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(normal).not.toContain('High load on');
  expect(normal).not.toContain('stroke-danger');
  week.muscles = { quads: 9, calves: 21 };
  const high = renderToStaticMarkup(createElement(AnalyticsPanel, { weeks: data }));
  expect(high).toContain('High load on calves');
  expect(high).not.toContain('High load on legs');
});
