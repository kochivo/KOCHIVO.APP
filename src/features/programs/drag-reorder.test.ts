import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as React from 'react';
import type * as UI from '@/ui';
import { LocaleProvider } from '@/core/i18n/client';
import { DragHandle } from './components/drag-handle';
import { DayEditor } from './components/day-editor';
import { getTargetIndex, useDragReorder } from './hooks/use-drag-reorder';
import type { DraftDay, ProgramDraft } from './types';
import { emptyWarmup } from './warmup';

const hooks = vi.hoisted(() => ({ active: false, index: 0, slots: [] as unknown[],
  effects: [] as (() => void | (() => void))[], buttons: new Map<string, React.ButtonHTMLAttributes<HTMLButtonElement>>() }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  const slot = (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return index;
  };
  return { ...react,
    useState: (initial: unknown) => {
      if (!hooks.active) return react.useState(initial);
      const index = slot(initial);
      return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value; }];
    },
    useRef: (initial: unknown) => hooks.active ? hooks.slots[slot({ current: initial })] : react.useRef(initial),
    useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
      if (!hooks.active) return react.useEffect(effect, deps);
      const index = slot(undefined);
      const previous = hooks.slots[index] as unknown[] | undefined;
      if (!previous || deps.some((value, i) => !Object.is(value, previous[i]))) hooks.effects.push(effect);
      hooks.slots[index] = deps;
    },
  };
});
vi.mock('@/ui', async original => {
  const ui = await original<typeof UI>();
  return { ...ui, IconButton: (props: React.ComponentProps<typeof ui.IconButton>) => {
    hooks.buttons.set(props['aria-label'], props);
    return createElement(ui.IconButton, props);
  } };
});
afterEach(() => {
  hooks.active = false; hooks.index = 0; hooks.slots = []; hooks.effects = []; hooks.buttons.clear();
  vi.unstubAllGlobals();
});

describe('drag destination', () => {
  it.each([
    [-100, 0], [19, 0], [20, 1], [59, 1], [60, 2], [500, 2],
  ])('maps Y %s to insertion index %s using the remaining row midpoints', (y, expected) => {
    expect(getTargetIndex(y, [20, 60])).toBe(expected);
  });
  it('has a safe destination for an empty list', () => {
    expect(getTargetIndex(100, [])).toBe(0);
  });
});

it.each([
  ['ar', 'اسحب لترتيب: بنش، 1'], ['en', 'Drag to reorder: Bench, 1'],
] as const)('renders a translated, scroll-safe handle in %s', (locale, label) => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(DragHandle, { name: locale === 'ar' ? 'بنش' : 'Bench', position: '1', onMove() {} })));
  expect(html).toContain(`aria-label="${label}"`);
  expect(html).toContain('touch-none');
  expect(html).toContain('min-h-12');
  expect(html).toContain('min-w-12');
  expect(html).toContain('type="button"');
});

const day: DraftDay = { id: 'day', program_id: 'program', title: 'Day', position: 1, warmup: emptyWarmup(),
  exercises: ['a', 'b', 'c'].map((id, index) => ({ id, day_id: 'day', exercise_id: 'bench', position: index + 1,
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, rir: null, notes: null, superset_group: null,
    library: { id: 'bench', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: null, media_path: null },
  })) };

it('wires handles and a polite live region without physical RTL classes', () => {
  const html = renderToStaticMarkup(createElement(DayEditor, { day, update: vi.fn() }));
  expect(html.match(/اسحب لترتيب:/g)).toHaveLength(3);
  expect(html).toContain('aria-live="polite"');
  expect(html).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-/);
});

it('keeps the move menu fallback and keyboard moves announce the new position', () => {
  hooks.active = true;
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
  let current: ProgramDraft = { id: 'program', player_id: null, title: 'Plan', status: 'draft', days: [day] };
  const update = vi.fn((operation: (draft: typeof current) => typeof current) => { current = operation(current); });
  const render = () => {
    hooks.index = 0;
    return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
      createElement(DayEditor, { day: current.days[0] ?? day, update })));
  };
  render();
  const preventDefault = vi.fn();
  hooks.buttons.get('Drag to reorder: Bench, 1')?.onKeyDown?.({ key: 'ArrowUp', preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>);
  expect(update).not.toHaveBeenCalled();
  hooks.buttons.get('Drag to reorder: Bench, 1')?.onKeyDown?.({ key: 'ArrowDown', preventDefault } as unknown as React.KeyboardEvent<HTMLButtonElement>);
  const html = render();
  expect(current.days[0]?.exercises.map(row => row.id)).toEqual(['b', 'a', 'c']);
  expect(update).toHaveBeenCalledOnce();
  expect(preventDefault).toHaveBeenCalledTimes(2);
  expect(html).toContain('>Bench is now 2</p>');
  hooks.buttons.get('Exercise options: Bench, 2')?.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  const menu = render();
  expect(menu).toContain('Move up: Bench, 2');
  expect(menu).toContain('Move down: Bench, 2');
});

function dragHarness() {
  hooks.active = true;
  let scrollY = 0;
  let tick: FrameRequestCallback | undefined;
  const events = new Map<string, (event: { key: string; preventDefault: () => void }) => void>();
  const scrollBy = vi.fn(({ top }: { top: number }) => { scrollY += top; });
  vi.stubGlobal('window', { get scrollY() { return scrollY; }, innerHeight: 800, scrollBy,
    addEventListener: (name: string, handler: typeof events extends Map<string, infer V> ? V : never) => events.set(name, handler),
    removeEventListener: (name: string) => events.delete(name) });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { tick = callback; return 1; });
  const cancelFrame = vi.fn();
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  const onDrop = vi.fn();
  let result: ReturnType<typeof useDragReorder>;
  function Harness() { result = useDragReorder(['a', 'b', 'c'], onDrop); return null; }
  const cleanups: (() => void)[] = [];
  const render = () => {
    hooks.index = 0;
    renderToStaticMarkup(createElement(Harness));
    for (const effect of hooks.effects.splice(0)) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
    return result;
  };
  const controller = render();
  controller.listRef.current = { children: [
    { top: 100, height: 100 }, { top: 216, height: 200 }, { top: 432, height: 150 },
  ].map(rect => ({ getBoundingClientRect: () => rect })) } as unknown as HTMLOListElement;
  let captured = false;
  const handle = { focus: vi.fn(), setPointerCapture: vi.fn(() => { captured = true; }),
    hasPointerCapture: () => captured, releasePointerCapture: vi.fn(() => { captured = false; }) };
  const pointer = (clientY: number, pointerId = 1) => ({ currentTarget: handle, clientY, pointerId,
    button: 0, isPrimary: true, preventDefault() {} }) as unknown as React.PointerEvent<HTMLButtonElement>;
  return { render, controller, onDrop, handle, pointer, scrollBy, cancelFrame,
    tick: () => tick?.(0), escape: () => events.get('keydown')?.({ key: 'Escape', preventDefault() {} }),
    unmount: () => cleanups.forEach(cleanup => cleanup()) };
}

it('previews variable height rows without updating, then commits exactly once', () => {
  const h = dragHarness();
  const props = h.controller.handleProps('a');
  props.onPointerDown?.(h.pointer(150));
  expect(h.handle.setPointerCapture).toHaveBeenCalledWith(1);
  props.onPointerMove?.(h.pointer(550));
  const preview = h.render();
  expect(preview.draggingId).toBe('a');
  expect(preview.rowStyle(0)?.transform).toBe('translateY(400px)');
  expect(preview.rowStyle(1)?.transform).toBe('translateY(-116px)');
  expect(preview.rowStyle(2)?.transform).toBe('translateY(-116px)');
  expect(h.onDrop).not.toHaveBeenCalled();
  props.onPointerUp?.(h.pointer(550, 2));
  expect(h.onDrop).not.toHaveBeenCalled();
  props.onPointerUp?.(h.pointer(550));
  props.onPointerUp?.(h.pointer(550));
  expect(h.onDrop).toHaveBeenCalledExactlyOnceWith('a', 2);
  expect(h.handle.releasePointerCapture).toHaveBeenCalledWith(1);
  expect(h.render().draggingId).toBeNull();
});

it.each(['same', 'cancel', 'escape', 'lost', 'unmount'])('does not commit on %s', mode => {
  const h = dragHarness();
  const props = h.controller.handleProps('b');
  props.onPointerDown?.(h.pointer(300));
  if (mode !== 'same') props.onPointerMove?.(h.pointer(100));
  if (mode === 'cancel') props.onPointerCancel?.(h.pointer(100));
  else if (mode === 'escape') h.escape();
  else if (mode === 'lost') props.onLostPointerCapture?.(h.pointer(100));
  else if (mode === 'unmount') h.unmount();
  props.onPointerUp?.(h.pointer(mode === 'same' ? 300 : 100));
  expect(h.onDrop).not.toHaveBeenCalled();
  expect(h.cancelFrame).toHaveBeenCalled();
});

it('scrolls at both viewport edges and accounts for scroll in the drag offset', () => {
  const h = dragHarness();
  const props = h.controller.handleProps('a');
  props.onPointerDown?.(h.pointer(150));
  props.onPointerMove?.(h.pointer(790));
  h.tick();
  expect(h.scrollBy).toHaveBeenLastCalledWith({ top: 11, behavior: 'instant' });
  expect(h.render().rowStyle(0)?.transform).toBe('translateY(651px)');
  props.onPointerMove?.(h.pointer(10));
  h.tick();
  expect(h.scrollBy).toHaveBeenLastCalledWith({ top: -11, behavior: 'instant' });
  props.onPointerCancel?.(h.pointer(10));
});

it('ignores secondary pointers and mouse buttons and leaves unrelated rows still', () => {
  const h = dragHarness();
  const props = h.controller.handleProps('c');
  props.onPointerDown?.({ ...h.pointer(500), button: 2 });
  props.onPointerDown?.({ ...h.pointer(500), isPrimary: false });
  expect(h.handle.setPointerCapture).not.toHaveBeenCalled();
  props.onPointerDown?.(h.pointer(500));
  props.onPointerMove?.(h.pointer(300));
  const preview = h.render();
  expect(preview.rowStyle(0)?.transform).toBe('translateY(0px)');
  expect(preview.rowStyle(1)?.transform).toBe('translateY(166px)');
  props.onPointerUp?.(h.pointer(300));
  expect(h.onDrop).toHaveBeenCalledExactlyOnceWith('c', 1);
});
