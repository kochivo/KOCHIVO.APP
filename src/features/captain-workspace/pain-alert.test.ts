import { createElement, isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { PainAlert } from './components/pain-alert';
import { answerPain } from './data/pain-reports';
const hooks = vi.hoisted(() => ({ interactive: false, index: 0, values: [] as unknown[] }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useRef: (initial: unknown) => hooks.interactive ? { current: initial } : react.useRef(initial),
    useState: (initial: unknown) => {
      if (!hooks.interactive) return react.useState(initial);
      const index = hooks.index++;
      if (!(index in hooks.values)) hooks.values[index] = initial;
      return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
    } };
});
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  rpc: async () => ({ error: { message: 'No safe alternative', code: '22023' } }),
}) }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/client', () => ({ useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en'), useLocale: () => 'en' }));
it('renders captain context, repeated pain warning and all four replies', () => {
  const report = { id: 'report', captain_id: 'captain', player_id: 'player', session_id: null, program_exercise_id: null,
    set_index: 3, area: 'knee_r' as const, severity: 5, kind: 'sharp' as const, side_view: 'front' as const,
    created_at: '2026-11-15T10:00:00Z', status: 'open' as const, reply: null, answered_at: null,
    player_name: 'Mona', exercise_name: 'Squat', repeat_count: 2 };
  const html = renderToStaticMarkup(createElement(PainAlert, { report,
    now: Date.parse('2026-11-15T10:05:00Z'), onAnswer: async () => {} }));
  for (const text of ['Mona', 'Squat', 'Right knee', '5 minutes ago', 'again this month', 'Reduce load 20%', 'Talk', 'Rest this region', 'Swap for 2 weeks']) expect(html).toContain(text);
});
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
it('renders the no-safe-swap reason and keeps the open report and other replies usable', async () => {
  hooks.interactive = true; hooks.values = [];
  const replies: string[] = [];
  const props = { report: { id: 'report', captain_id: 'captain', player_id: 'player', session_id: null,
    program_exercise_id: null, set_index: 3, area: 'knee_r' as const, severity: 5, kind: 'sharp' as const,
    side_view: 'front' as const, created_at: '2026-11-15T10:00:00Z', status: 'open' as const,
    reply: null, answered_at: null, player_name: 'Mona', exercise_name: 'Squat', repeat_count: 2 },
    now: Date.parse('2026-11-15T10:05:00Z'), onAnswer: async (reply: Parameters<typeof answerPain>[1]) => {
      if (reply === 'swap_2w') await answerPain('report', reply);
      replies.push(reply);
    } };
  const render = () => { hooks.index = 0; return PainAlert(props); };
  try {
    const swap = nodes(render()).find(node => node.props.children === 'Swap for 2 weeks');
    (swap?.props.onClick as () => void)();
    for (let turn = 0; turn < 6; turn++) await Promise.resolve();
    expect(renderToStaticMarkup(render())).toContain('No safe swap for this exercise in the program. Pick reduce 20% or rest this area this week, or add alternatives to the exercise in the program.');
    expect(props.report.status).toBe('open');
    for (const label of ['Reduce load 20%', 'Rest this region this week', 'Talk']) {
      const button = nodes(render()).find(node => node.props.children === label);
      expect(button?.props.disabled).toBe(false);
      (button?.props.onClick as () => void)();
      await Promise.resolve();
    }
    expect(replies).toEqual(['reduce_20', 'rest_week', 'talk']);
    expect(renderToStaticMarkup(render())).not.toContain('role="alert"');
  } finally { hooks.interactive = false; }
});
