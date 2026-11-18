import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProgressV3 } from './components/progress-v3';
import type { CheckIn } from './data/checkins';
import { LineChart } from './components/line-chart';
import { createT } from '@/core/i18n/messages';
import { messages as legacyMessages } from './messages';
import { Button } from '@/ui/button';

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as ReturnType<typeof vi.fn>[] }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'ar', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => {
  const index = state.index++;
  const setter = vi.fn(); state.setters[index] = setter;
  return [index in state.values ? state.values[index] : initial, setter];
} }));
beforeEach(() => { state.index = 0; state.values = []; state.setters = []; });
const props = { today: '2026-11-13', checkins: [] as CheckIn[], strength: { sets: [], names: {} }, count: 7,
  checkinError: false, strengthError: false, retry() {}, onLog: vi.fn() };
function find(node: ReactNode, type: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return node.type === type ? [node as React.ReactElement<Record<string, unknown>>] : find(node.props.children, type);
}
it('shows the exact empty copy and a real history count without sample chart values', () => {
  const html = renderToStaticMarkup(createElement(ProgressV3, props));
  expect(html).toContain('سجّل وزنك أول مرة');
  expect(html).toContain('لسه مافيش تمارين كفاية للرسم');
  expect(html).toContain('hairline-cells');
  expect(html).toContain('>7</span>');
  expect(html).not.toContain('<svg width="100%"');
});
it('opens the existing sheet and changes the pressed range control', () => {
  const tree = ProgressV3(props);
  const buttons = [...find(tree, 'button'), ...find(tree, Button)];
  const log = buttons.find(button => button.props['aria-label'] === createT(legacyMessages, 'ar')('sendWeeklyCheckin'));
  if (typeof log?.props.onClick !== 'function') throw new Error('Missing log control');
  log.props.onClick();
  expect(props.onLog).toHaveBeenCalledOnce();
  const quarter = buttons.find(button => button.props.children === '6 شهور');
  if (typeof quarter?.props.onClick !== 'function') throw new Error('Missing range control');
  quarter.props.onClick();
  expect(state.setters[0]).toHaveBeenCalledWith(6);
});
it('feeds the selected range into both charts and keeps the program baseline for strength', () => {
  state.values = [1, 'bench'];
  const data = { ...props, checkins: [{ week_start: '2026-08-20', body_weight_kg: 80 }, { week_start: '2026-10-20', body_weight_kg: 81 }, { week_start: '2026-11-13', body_weight_kg: 82.4 }] as CheckIn[],
    strength: { names: { bench: 'بنش' }, sets: ['2026-08-20', '2026-10-20', '2026-11-13'].map((training_date, index) => ({ exercise_id: 'bench', training_date, weight_kg: 65 + index * 5, reps: 8 })) } };
  const html = renderToStaticMarkup(createElement(ProgressV3, data));
  expect(html).toContain('hairline-cells');
  expect(html).toContain('+1.4');
  expect(html).toContain('1,680');
  expect(html.indexOf('dateTime="2026-10-20"')).toBeLessThan(html.indexOf('dateTime="2026-11-13"'));
  expect(html).toContain('النهارده');
  state.index = 0;
  const charts = find(ProgressV3(data), LineChart);
  expect(charts.map(chart => chart.props.points)).toEqual([
    [{ date: '2026-10-20', value: 81 }, { date: '2026-11-13', value: 82.4 }],
    [{ date: '2026-10-20', value: 70, reps: 8 }, { date: '2026-11-13', value: 75, reps: 8 }],
  ]);
  state.index = 0; state.values = [6, 'bench'];
  expect(find(ProgressV3(data), LineChart).map(chart => (chart.props.points as unknown[]).length)).toEqual([3, 3]);
});
