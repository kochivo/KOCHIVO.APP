import { Children, isValidElement } from 'react';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { TasksScreen } from './tasks-screen';
import { PhoneTaskCard } from './phone-task-card';
import type { CaptainTask } from './tasks-model';

const state = vi.hoisted(() => ({
  task: {} as CaptainTask, values: [] as unknown[], cursor: 0, push: vi.fn(), mutate: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock('./use-phone-tasks', () => ({ usePhoneTasks: () => true, usePhoneTaskHash: () => '' }));
vi.mock('@/core/resource', () => ({
  useResource: () => ({ data: { tasks: [state.task], at: '2026-11-18T12:00:00Z',
    triage: { history: [], dailyChecks: [] } }, mutate: state.mutate }),
}));

function find(node: ReactNode, test: (type: unknown, props: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (test(child.type, child.props)) return child.props;
    const nested = find(child.props.children as ReactNode, test);
    if (nested) return nested;
  }
}
function screen() { state.cursor = 0; return TasksScreen(); }
function openTask() {
  const action = find(screen(), type => type === PhoneTaskCard)?.onAction;
  if (typeof action !== 'function') throw new Error('Expected a task action');
  action();
}
const base = { name: 'Sara', playerId: 'player', at: '2026-11-18T10:00:00Z' };
beforeEach(() => { state.values = []; state.push.mockClear(); state.mutate.mockClear(); });

it('opens a form video in the existing phone review dialog', () => {
  const item = { id: 'video', kind: 'form' } as CaptainTask['item'];
  state.task = { ...base, id: 'video:video', kind: 'video', item };
  openTask();
  expect(find(screen(), (_, props) => props.item === item && props.phone === true && typeof props.onReviewed === 'function')).toBeDefined();
  expect(state.mutate).not.toHaveBeenCalled();
});

it('opens the program editor without removing the outstanding task', () => {
  state.task = { ...base, id: 'program:player', kind: 'program' };
  openTask();
  expect(state.push).toHaveBeenCalledWith('/en/captain/players/player/programs');
  expect(state.mutate).not.toHaveBeenCalled();
});
