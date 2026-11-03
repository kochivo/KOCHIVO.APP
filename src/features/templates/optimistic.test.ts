import { beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[],
  t: (key: string, values?: Record<string, unknown>) => key + (values ? JSON.stringify(values) : ''), data: undefined as unknown,
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) hooks.effects.push(effect);
    hooks.slots[index] = deps;
  },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as { callback: unknown; deps: unknown[] } | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) hooks.slots[index] = { callback, deps };
    return (hooks.slots[index] as { callback: unknown }).callback;
  },
  useTransition: () => [false, (action: () => void) => action()],
  use: () => hooks.data,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => hooks.t, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join('');
  return isValidElement<Record<string, unknown>>(value) ? text(value.props.children) : typeof value === 'string' ? value : '';
}
function deferred<T>() {
  let resolve: (result: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
beforeEach(() => {
  hooks.slots = []; hooks.cursor = 0; hooks.effects = [];
  vi.clearAllMocks();
});

import { TemplatesScreen } from './components/templates-screen';
import { listTemplates, copyTemplate, renameTemplate, deleteTemplate } from './data/templates';
import type { Template } from './types';
import { uuidv7 } from '@/core/offline/ids';
vi.mock('./data/templates', () => ({
  listTemplates: vi.fn(), copyTemplate: vi.fn(), renameTemplate: vi.fn(), deleteTemplate: vi.fn(),
}));
vi.mock('./components/assign-sheet', () => ({ AssignSheet: () => null }));
vi.mock('./components/preview-sheet', () => ({ PreviewSheet: () => null }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: vi.fn(() => 'placeholder') }));
const templates: Template[] = ['a', 'b'].map(id => ({
  id, title: id, kind: 'program', created_at: '2026-11-03', count: 3, starter: false,
}));
function render() { hooks.cursor = 0; return TemplatesScreen(); }
async function load() {
  vi.mocked(listTemplates).mockResolvedValue({ data: templates });
  render(); hooks.effects.splice(0).forEach(effect => effect()); await settle();
}
function rows() { return nodes(render()).filter(node => node.type === 'li'); }
function button(row: Node, action: string) {
  const node = nodes(row).find(node => String(node.props['aria-label'] ?? '').startsWith(action)
    || (text(node.props.children) === action && typeof node.props.onClick === 'function'));
  expect(node).toBeDefined(); return node as Node;
}
it.each((['rename', 'delete', 'copy'] as const).flatMap(action => ['error', 'throw'].map(mode => ({ action, mode }))))('updates $action immediately and rolls back on $mode', async ({ action, mode }) => {
  await load();
  vi.stubGlobal('window', { confirm: () => true, prompt: () => '  Renamed  ' });
  const request = deferred<{ error: string }>();
  const commit = action === 'rename' ? renameTemplate : action === 'delete' ? deleteTemplate : copyTemplate;
  vi.mocked(commit).mockReturnValue(request.promise);
  const first = rows()[0]; expect(first).toBeDefined();
  const trigger = button(first as Node, action).props.onClick as () => void;
  trigger(); trigger();
  expect(commit).toHaveBeenCalledTimes(1);
  expect(rows()).toHaveLength(action === 'delete' ? 1 : action === 'copy' ? 3 : 2);
  if (action === 'rename') expect(text(rows()[0])).toContain('Renamed');
  if (action === 'copy') expect(nodes(rows()[0]).filter(node => typeof node.props.onClick === 'function').every(node => node.props.disabled)).toBe(true);
  const other = rows().find(row => text(row).startsWith('b'));
  expect(nodes(other).some(node => node.props.disabled === false)).toBe(true);
  if (mode === 'error') request.resolve({ error: 'denied' }); else request.reject(new Error('network'));
  await settle();
  expect(rows().map(row => text(nodes(row).find(node => node.type === 'h2')))).toEqual(['a', 'b']);
  expect(nodes(render()).some(node => node.props.role === 'alert' && text(node).includes(mode === 'error' ? 'denied' : 'couldntSaveChangesTryAgain'))).toBe(true);
  vi.unstubAllGlobals();
});
it('replaces the duplicate placeholder with the server id without reloading the list', async () => {
  await load();
  const request = deferred<{ data: string }>(); vi.mocked(copyTemplate).mockReturnValue(request.promise);
  (button(rows()[0] as Node, 'copy').props.onClick as () => void)();
  expect(rows()[0]?.key).toBe('program-placeholder');
  request.resolve({ data: 'real-id' }); await settle();
  expect(rows()[0]?.key).toBe('program-real-id');
  expect(listTemplates).toHaveBeenCalledTimes(1);
});
it('does not overwrite another successful rename when a deletion fails', async () => {
  await load(); vi.stubGlobal('window', { confirm: () => true, prompt: () => 'Renamed' });
  const deletion = deferred<{ error: string }>(); vi.mocked(deleteTemplate).mockReturnValue(deletion.promise);
  vi.mocked(renameTemplate).mockResolvedValue({ data: true });
  const before = rows();
  (button(before[0] as Node, 'delete').props.onClick as () => void)();
  (button(before[1] as Node, 'rename').props.onClick as () => void)();
  await settle(); deletion.resolve({ error: 'denied' }); await settle();
  expect(rows().map(row => text(nodes(row).find(node => node.type === 'h2')))).toEqual(['a', 'Renamed']);
  vi.unstubAllGlobals();
});

it('reconciles concurrent duplicates independently', async () => {
  await load();
  vi.mocked(uuidv7).mockReturnValueOnce('placeholder-a').mockReturnValueOnce('placeholder-b');
  const first = deferred<{ error: string }>(); const second = deferred<{ data: string }>();
  vi.mocked(copyTemplate).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const before = rows();
  for (const row of before) (button(row, 'copy').props.onClick as () => void)();
  expect(rows()).toHaveLength(4);
  second.resolve({ data: 'real-b' }); first.resolve({ error: 'denied' }); await settle();
  expect(rows().map(row => row.key)).toEqual(['program-real-b', 'program-a', 'program-b']);
});

