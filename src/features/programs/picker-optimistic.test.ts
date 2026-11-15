import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chip } from '@/ui';
import { Check } from 'lucide-react';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { ExercisePicker } from './components/exercise-picker';
import { CustomExerciseSheet } from './components/custom-exercise-sheet';
import type { LibraryExercise, Result } from './types';
import type { CustomExerciseInput } from './custom-exercises';

type SheetProps = { onSave: (input: CustomExerciseInput) => void };
const hooks = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as { current: unknown }[],
  index: 0, refIndex: 0, save: vi.fn(), remove: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: () => {},
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    hooks.refs[index] ??= { current: initial };
    return hooks.refs[index];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: hooks.success, error: hooks.error }) }));
vi.mock('next/dynamic', () => ({ default: () => function Sheet() { return null; } }));
vi.mock('./data/library', () => ({ searchExercises: vi.fn() }));
vi.mock('./data/custom-exercise', () => ({ createCustomExercise: hooks.save, updateCustomExercise: hooks.save, deleteCustomExercise: hooks.remove }));

type NodeProps = { children?: unknown; onClick?: () => void; onSave?: SheetProps['onSave']; exercise?: unknown;
  className?: string;
  disabled?: boolean; pressed?: boolean; value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onSubmit?: (event: { preventDefault: () => void }) => void;
  onCancel?: (event: { preventDefault: () => void; stopPropagation: () => void }) => void };
function elements(node: unknown): ReactElement<NodeProps>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<NodeProps>;
  return [element, ...elements(element.props.children)];
}
function render(onAdd: (row: LibraryExercise) => void, usedExerciseIds: string[] = []) {
  hooks.index = 0; hooks.refIndex = 0;
  return elements(ExercisePicker({ disabled: false, onAdd, ...{ usedExerciseIds } }));
}
function open(nodes: ReactElement<NodeProps>[]) {
  const button = nodes.find(node => node.props.children === 'newCustomExercise');
  expect(button).toBeDefined(); button?.props.onClick?.();
}
function submit(nodes: ReactElement<NodeProps>[]) {
  const sheet = nodes.find(node => node.props.onSave);
  expect(sheet).toBeDefined(); sheet?.props.onSave?.({ name: 'Custom press', bodyPart: 'chest' });
}
beforeEach(() => {
  vi.clearAllMocks(); hooks.refs = [];
  hooks.values = ['', '', 0, { data: [] }, '["","",0]'];
});
it('shows a new exercise before persistence and safely adds its reconciled row to the day', async () => {
  let resolve: ((result: Result<LibraryExercise>) => void) | undefined;
  hooks.save.mockReturnValue(new Promise<Result<LibraryExercise>>(done => { resolve = done; }));
  const onAdd = vi.fn();
  open(render(onAdd)); submit(render(onAdd));
  const nodes = render(onAdd);
  expect(nodes.some(node => node.props.children === 'Custom press')).toBe(true);
  const add = nodes.find(node => node.props.className?.includes('min-h-16'));
  expect(add).toBeDefined(); add?.props.onClick?.();
  expect(onAdd).not.toHaveBeenCalled();
  const id = hooks.save.mock.calls[0]?.[1] as string;
  const saved: LibraryExercise = { id, name_ar: 'Custom press', name_en: 'Custom press', body_part: 'chest',
    equipment: null, media_path: null, is_own: true };
  resolve?.({ data: saved });
  await Promise.resolve(); await Promise.resolve();
  expect(onAdd).toHaveBeenCalledExactlyOnceWith(saved);
  expect(render(onAdd).filter(node => node.props.children === 'Custom press')).toHaveLength(1);
  expect(hooks.success).toHaveBeenCalledWith('customExerciseSaved');
});
it('rolls back a failed optimistic insert and never adds an unpersisted row', async () => {
  let resolve: ((result: Result<LibraryExercise>) => void) | undefined;
  hooks.save.mockReturnValue(new Promise<Result<LibraryExercise>>(done => { resolve = done; }));
  const onAdd = vi.fn();
  open(render(onAdd)); submit(render(onAdd));
  render(onAdd).find(node => node.props.className?.includes('min-h-16'))?.props.onClick?.();
  resolve?.({ error: 'Save failed' });
  await Promise.resolve(); await Promise.resolve();
  expect(render(onAdd).some(node => node.props.children === 'Custom press')).toBe(false);
  expect(onAdd).not.toHaveBeenCalled(); expect(hooks.error).toHaveBeenCalledWith('Save failed');
});
it('dismisses only the custom sheet when Escape is pressed', () => {
  hooks.index = 0; hooks.refIndex = 0; hooks.values = [];
  const close = vi.fn();
  const nodes = elements(CustomExerciseSheet({ exercise: null, onClose: close, onSave() {} }));
  const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
  nodes.find(node => node.type === 'dialog')?.props.onCancel?.(event);
  expect(event.stopPropagation).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});
it('hides and clears the machine when switching away from cardio', () => {
  hooks.values = [];
  const onSave = vi.fn();
  const sheet = () => {
    hooks.index = 0; hooks.refIndex = 0;
    return elements(CustomExerciseSheet({ exercise: { id: 'cardio', name_ar: null, name_en: 'Walk',
      body_part: 'cardio', equipment: 'treadmill', media_path: null }, onClose() {}, onSave }));
  };
  expect(sheet().filter(node => node.type === 'select')).toHaveLength(2);
  expect(sheet().some(node => node.type === 'option' && node.props.value === 'stairmaster')).toBe(true);
  sheet().find(node => node.type === 'select' && node.props.value === 'cardio')?.props.onChange?.({ target: { value: 'core' } });
  expect(sheet().filter(node => node.type === 'select')).toHaveLength(1);
  sheet().find(node => node.type === 'select')?.props.onChange?.({ target: { value: 'cardio' } });
  expect(sheet().filter(node => node.type === 'select')[1]?.props.value).toBe('');
  sheet().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ equipment: null }));
});
it.each([['glutes', 'upper legs', 'glutes'], ['core', 'waist', 'abs']])(
  'keeps local library matches under the %s chip', (part, body_part, target) => {
    const library = { id: 'library', name_ar: null, name_en: 'Library match', body_part, target, equipment: null, media_path: null };
    const custom = { ...library, id: 'custom', name_en: 'Custom match', body_part: part };
    hooks.values[7] = [library, custom];
    render(vi.fn()).find(node => node.type === Chip && node.props.children === part)?.props.onClick?.();
    const nodes = render(vi.fn());
    expect(nodes.some(node => node.props.children === 'Library match')).toBe(true);
    expect(nodes.some(node => node.props.children === 'Custom match')).toBe(true);
  });
it('removes an archived exercise from the picker even when the draft uses it', async () => {
  hooks.values[3] = { data: [{ id: 'used', name_ar: 'Press', name_en: 'Press', body_part: 'chest', is_own: true }] };
  const nodes = render(vi.fn(), ['used']);
  hooks.remove.mockResolvedValue({ data: { archived: true } });
  nodes.find(node => node.props.children === 'deleteCustomExercise')?.props.onClick?.();
  await Promise.resolve();
  expect(hooks.remove).toHaveBeenCalledWith('used');
  expect(render(vi.fn()).some(node => node.props.children === 'Press')).toBe(false);
  expect(hooks.success).toHaveBeenCalledWith('customExerciseArchived');
});
it('blocks addition while deletion is pending and keeps the row on a delete failure', async () => {
  hooks.values[3] = { data: [{ id: 'unused', name_ar: 'Press', name_en: 'Press', body_part: 'chest', is_own: true }] };
  let resolve: ((result: Result<true>) => void) | undefined;
  hooks.remove.mockReturnValue(new Promise<Result<true>>(done => { resolve = done; }));
  const onAdd = vi.fn();
  render(onAdd).find(node => node.props.children === 'deleteCustomExercise')?.props.onClick?.();
  expect(render(onAdd).find(node => node.props.className?.includes('min-h-16'))?.props.disabled).toBe(true);
  resolve?.({ error: 'In use' }); await Promise.resolve();
  const nodes = render(onAdd);
  expect(nodes.find(node => node.props.className?.includes('min-h-16'))?.props.disabled).toBe(false);
  expect(nodes.some(node => node.props.children === 'Press')).toBe(true);
  expect(hooks.error).toHaveBeenCalledWith('In use');
});

const press: LibraryExercise = { id: 'press', name_ar: null, name_en: 'Press', body_part: 'chest', equipment: null, media_path: null };
it('derives the check and added label from the current day ids', () => {
  hooks.values[3] = { data: [press] };
  expect(render(vi.fn()).some(node => node.props.children === 'add')).toBe(true);
  const nodes = render(vi.fn(), ['press']);
  expect(nodes.some(node => node.props.children === 'added')).toBe(true);
  expect(nodes.some(node => node.type === Check)).toBe(true);
  expect(nodes.find(node => node.props.className?.includes('min-h-16'))?.props.disabled).toBe(false);
});
it('marks session additions immediately and adds another copy with a toast on every press', () => {
  hooks.values[3] = { data: [press] };
  const onAdd = vi.fn();
  render(onAdd).find(node => node.props.className?.includes('min-h-16'))?.props.onClick?.();
  const nodes = render(onAdd);
  expect(nodes.some(node => node.props.children === 'added')).toBe(true);
  expect(nodes.some(node => node.type === Check)).toBe(true);
  nodes.find(node => node.props.className?.includes('min-h-16'))?.props.onClick?.();
  expect(onAdd.mock.calls).toEqual([[press], [press]]);
  expect(hooks.success.mock.calls).toEqual([[{ title: 'added', detail: 'exerciseDetail', icon: 'program' }], [{ title: 'added', detail: 'exerciseDetail', icon: 'program' }]]);
});
it('shows the active chip for All, a muscle, and My exercises', () => {
  const onAdd = vi.fn();
  const chip = (label: string) => {
    const node = render(onAdd).find(item => item.props.children === label);
    expect(node?.type).toBe(Chip);
    if (!node) throw new Error(`Missing chip: ${label}`);
    return node;
  };
  expect(chip('all').props.pressed).toBe(true);
  expect(chip('chest').props.pressed).toBe(false);
  chip('chest').props.onClick?.();
  expect(chip('all').props.pressed).toBe(false);
  expect(chip('chest').props.pressed).toBe(true);
  expect(chip('myExercises').props.pressed).toBe(false);
  chip('myExercises').props.onClick?.();
  expect(chip('myExercises').props.pressed).toBe(true);
  chip('all').props.onClick?.();
  const all = chip('all');
  expect(all.props.pressed).toBe(true);
  const html = renderToStaticMarkup(Chip({ pressed: all.props.pressed === true }));
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('selected-surface border-lime bg-lime-soft text-lime');
  expect(html).toContain('h-chip');
});
