import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import type * as UI from '@/ui';
import { LocaleProvider } from '@/core/i18n/client';
import { DayEditor } from './components/day-editor';

const hooks = vi.hoisted(() => ({ active: false, index: 0, values: [] as unknown[], open: undefined as (() => void) | undefined }));
vi.mock('@/ui', async original => {
  const ui = await original<typeof UI>();
  return { ...ui, Button: (props: React.ComponentProps<typeof ui.Button>) => {
    if (Array.isArray(props.children) && props.children.includes('+ إضافة تمرين')) hooks.open = () => props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    return createElement(ui.Button, props);
  } };
});
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => {
    if (!hooks.active) return react.useState(initial);
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    const set = (value: unknown) => { hooks.values[index] = value; };
    return [hooks.values[index], set];
  } };
});
afterEach(() => { hooks.active = false; hooks.values = []; hooks.open = undefined; });

it('renders the day editor in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(DayEditor, {
    day: { id: 'day', program_id: 'program', title: 'Day 1', position: 1, exercises: [] }, update() {},
  })));
  expect(html).toContain('Day name');
  expect(html).toContain('+ Add exercise');
  expect(html).not.toContain('<dialog');
  expect(html).not.toMatch(/[\u0600-\u06ff]/);
});

it('mounts the library drawer only after the add exercise action', () => {
  hooks.active = true;
  const editor = createElement(DayEditor, {
    day: { id: 'day', program_id: 'program', title: 'Day 1', position: 1, exercises: [] }, update() {},
  });
  const render = () => { hooks.index = 0; return renderToStaticMarkup(editor); };
  expect(render()).not.toContain('role="dialog"');
  expect(render()).not.toContain('<dialog');
  expect(hooks.open).toBeDefined();
  hooks.open?.();
  const opened = render();
  expect(opened).toContain('<dialog');
  expect(opened).toContain('aria-label="مكتبة التمارين"');
});
