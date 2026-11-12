import { createElement } from 'react';
import type * as React from 'react';
import type * as Templates from '@/features/templates';
import type * as UI from '@/ui';
import type * as Dialog from '@/ui/responsive-dialog';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { BuilderHeader } from './builder-header';
import { BuilderNavigation } from './builder-navigation';
import { BuilderMenu } from './builder-menu';
import { RepsSheet } from './reps-sheet';
import { RestSheet } from './rest-sheet';
import { RirSheet } from './rir-sheet';
import { ExerciseRow } from './exercise-row';
import { convertToWeek } from '../weekly-draft';
import type { DraftExercise, ProgramDraft } from '../types';
import { emptyWarmup } from '../warmup';
vi.mock('server-only', () => ({}));

const controls = vi.hoisted(() => ({ clicks: new Map<string, () => void>(), values: [] as unknown[], index: 0, fallback: '' }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => {
    const index = controls.index++;
    if (!(index in controls.values)) controls.values[index] = typeof initial === 'function' ? initial() : initial;
    return [controls.values[index], (value: unknown) => { controls.values[index] = value; }];
  } };
});
vi.mock('@/ui', async original => {
  const ui = await original<typeof UI>();
  const capture = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const label = props['aria-label'] ?? (typeof props.children === 'string' ? props.children : '');
    if (label && props.onClick && !props.disabled) controls.clicks.set(label, () => props.onClick?.({} as React.MouseEvent<HTMLButtonElement>));
  };
  return { ...ui,
    Button: (props: React.ComponentProps<typeof ui.Button>) => { capture(props); return createElement(ui.Button, props); },
    Chip: (props: React.ComponentProps<typeof ui.Chip>) => { capture(props); return createElement(ui.Chip, props); },
    IconButton: (props: React.ComponentProps<typeof ui.IconButton>) => { capture(props); return createElement(ui.IconButton, props); },
  };
});
vi.mock('@/features/templates', async original => ({ ...await original<typeof Templates>(), SaveTemplateButton: () => null }));
vi.mock('@/core/storage', () => ({ exerciseMediaUrl: (path: string) => `/media/${path}` }));
vi.mock('@/ui/responsive-dialog', async original => {
  const ui = await original<typeof Dialog>();
  return { ResponsiveDialog: (props: React.ComponentProps<typeof ui.ResponsiveDialog>) => {
    controls.fallback = props.fallbackId;
    return createElement(ui.ResponsiveDialog, props);
  } };
});
beforeEach(() => { controls.clicks.clear(); controls.values = []; controls.index = 0; });
const render = (element: React.ReactElement, locale: 'ar' | 'en' = 'en') => {
  controls.index = 0;
  return renderToStaticMarkup(createElement(LocaleProvider, { locale }, element));
};
const row: DraftExercise = { id: 'a', day_id: 'day', exercise_id: 'bench', position: 1, sets: 3,
  reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, rir: null,
  library: { id: 'bench', name_ar: 'بنش', name_en: 'Bench', body_part: 'chest', equipment: null, media_path: 'bench.gif' } };
const draft: ProgramDraft = { id: 'p', player_id: 'player', status: 'draft', title: 'Plan',
  days: [{ id: 'day', program_id: 'p', title: 'Chest', position: 1, exercises: [row], warmup: emptyWarmup() }] };

it('keeps one primary send action and a separate status and dirty message', () => {
  const onSave = vi.fn(); const onActivate = vi.fn();
  const html = render(createElement(BuilderHeader, { draft, dirty: true, busy: false, onTitle() {}, onSave, onActivate }));
  expect(html.match(/primary-surface/g)).toHaveLength(1);
  expect(html).toContain('There are unsaved changes');
  expect(html).toContain('>Draft</span>');
  expect(html).toContain('bottom-[var(--nav-clearance)]');
  controls.clicks.get('Save without sending')?.();
  controls.clicks.get('Save and send to the player')?.();
  expect(onSave).toHaveBeenCalledOnce(); expect(onActivate).toHaveBeenCalledOnce();
});

it('renders seven responsive weekday chips with rest or exercise status', () => {
  const weekly = convertToWeek(draft, () => 'empty');
  const html = render(createElement(BuilderNavigation, { draft: weekly, selectedId: 'day', onSelect() {}, update() {} }));
  expect(html.match(/aria-pressed=/g)).toHaveLength(7);
  expect(html).toContain('Saturday'); expect(html).toContain('Friday');
  expect(html).toContain('1 exercise'); expect(html).toContain('Rest');
  expect(html).toContain('overflow-x-auto'); expect(html).toContain('lg:flex-col');
  expect(html).not.toContain('Move day'); expect(html).not.toContain('Delete');
});

it('only deletes after confirmation in the overflow dialog', () => {
  const onDelete = vi.fn(); const move = vi.fn();
  const menu = createElement(BuilderMenu, { id: 'menu', fallbackId: 'day-heading', label: 'Options', name: 'Bench', onDelete,
    actions: [{ label: 'Move', onClick: move }] });
  expect(render(menu)).not.toContain('<dialog');
  controls.clicks.get('Options')?.();
  expect(render(menu)).toContain('<dialog');
  expect(controls.fallback).toBe('day-heading');
  controls.clicks.get('Delete')?.();
  expect(onDelete).not.toHaveBeenCalled();
  expect(render(menu)).toContain('Delete Bench?');
  controls.clicks.get('Delete')?.();
  expect(onDelete).toHaveBeenCalledOnce(); expect(move).not.toHaveBeenCalled();
});

it('changes reps mode without a silently invented range, with only typeable stepper fields', () => {
  const onUpdate = vi.fn();
  const html = render(createElement(RepsSheet, { row, openerId: 'reps', onClose() {}, onUpdate }));
  expect(html.match(/size-19/g)).toHaveLength(4);
  expect(html).toContain('From'); expect(html).toContain('Up to');
  expect(html.match(/<input /g)).toHaveLength(html.match(/<input [^>]*inputMode="decimal"/g)?.length ?? -1);
  controls.clicks.get('Fixed number')?.();
  expect(onUpdate).toHaveBeenLastCalledWith({ reps_min: 8, reps_max: 8 });
  controls.clicks.get('To failure')?.();
  expect(onUpdate).toHaveBeenLastCalledWith({ reps_min: 8, reps_max: null });
});

it('uses preset rest chips and a gym stepper without a select', () => {
  const onChange = vi.fn();
  const html = render(createElement(RestSheet, { value: 90, openerId: 'rest', onClose() {}, onChange }));
  expect(html.match(/aria-pressed=/g)).toHaveLength(7);
  expect(html).not.toContain('<select');
  controls.clicks.get('120 s')?.();
  expect(onChange).toHaveBeenCalledWith(120);
});

it('offers an optional RIR with every target from zero to five', () => {
  const onChange = vi.fn();
  const html = render(createElement(RirSheet, { value: 2, openerId: 'rir', onClose() {}, onChange }));
  expect(html.match(/aria-pressed=/g)).toHaveLength(7);
  expect(html).toContain('Reps left in the tank before failure');
  controls.clicks.get('—')?.();
  expect(onChange).toHaveBeenLastCalledWith(null);
  controls.clicks.get('0')?.();
  expect(onChange).toHaveBeenLastCalledWith(0);
  expect(controls.fallback).toBe('rir');
  expect(render(createElement(RirSheet, { value: null, openerId: 'rir', onClose() {}, onChange }), 'ar'))
    .toContain('عدد العدات اللي تفضل في خزانك قبل الفشل');
});

it('shows media, order, summary and the superset connector in an uncluttered row', () => {
  const html = render(createElement(ExerciseRow, { row: { ...row, superset_group: 1 }, first: true, last: false,
    onLink() {}, onMove() {}, onDelete() {}, onUpdate() {} }));
  expect(html).toContain('width="48"');
  expect(html).toContain('3 sets × 8–12 reps · rest 90 s');
  expect(html).toContain('border-s-lime'); expect(html).toContain('Superset');
  expect(html).toContain('Exercise options: Bench, 1');
  expect(html).toContain('grid-cols-2'); expect(html).toContain('@md:grid-cols-4');
  expect(html).toContain('aria-label="RIR: Bench, 1"');
  expect(html).not.toContain('Move up'); expect(html).not.toContain('checkbox');
});
