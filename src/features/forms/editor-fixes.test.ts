import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemedSelect } from './components/themed-select';
import { QuestionField } from './components/question-field';
import { ScheduleEditor } from './components/schedule-editor';
import { copyTemplate, newQuestion } from './model';
import { templates } from './templates';
import { selectPosition } from './components/select-position';

afterEach(() => vi.unstubAllEnvs());

function elements<T>(node: ReactNode, type: unknown): ReactElement<T>[] {
  if (Array.isArray(node)) return node.flatMap(child => elements<T>(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [...(node.type === type ? [node as ReactElement<T>] : []), ...elements<T>(node.props.children, type)];
}

it('puts select options in the browser top layer, beyond glass stacking and overflow clipping', () => {
  const html = renderToStaticMarkup(createElement(ThemedSelect, { label: 'Target', value: 'all',
    options: [{ value: 'all', label: 'All players' }], onChange() {} }));
  expect(html).toContain('popover="auto"');
  expect(html).toMatch(/popovertarget=/i);
  expect(html).toContain('type="radio"');
});

it.each([false, true])('keeps options inside a 390px viewport and flips above a low trigger (RTL: %s)', rtl => {
  const placement = selectPosition({ x: 320, top: 680, bottom: 728, width: 62 }, 390, 760, rtl);
  expect(placement.start).toBeGreaterThanOrEqual(8);
  expect(placement.start + placement.width).toBeLessThanOrEqual(382);
  expect(placement.top).toBeUndefined();
  expect(placement.bottom).toBe(84);
  expect(760 - (placement.bottom ?? 0) - 104).toBe(572);
  expect(760 - (placement.bottom ?? 0)).toBe(676);
  expect(placement.maxBlockSize).toBe(288);
  const high = selectPosition({ x: 0, top: 8, bottom: 56, width: 400 }, 390, 760, rtl);
  expect(high).toEqual({ start: 8, top: 60, bottom: undefined, width: 374, maxBlockSize: 288 });
});

it.each(['egyptian', 'standard'] as const)('previews photos with translated camera/gallery controls (%s)', style => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(QuestionField, { question: { ...newQuestion('f', 0), type: 'photos' },
    locale: 'ar', style, preview: true }));
  expect(html).toContain('capture="user"');
  expect(html).toContain(style === 'standard' ? 'التقط صورة' : 'تصوّر');
  expect(html).toContain('من المعرض');
  // The gallery button must not force the camera, or phones hide the photo library.
  expect(html.match(/capture=/g)).toHaveLength(1);
  expect(html.match(/class="sr-only"/g)).toHaveLength(2);
});

it('keeps the manager unavailable until the form is saved', () => {
  const manage = vi.fn();
  const tree = ScheduleEditor({ form: copyTemplate(templates[0], 'captain'), locale: 'en', onChange() {}, onManage: manage, canManage: false });
  const selects = elements<Parameters<typeof ThemedSelect>[0]>(tree, ThemedSelect);
  expect(selects.find(s => s.props.options.some(o => o.value === 'advanced'))).toBeUndefined();
  const target = selects.find(s => s.props.options.some(o => o.value === 'players'));
  expect(target?.props.disabled).toBe(true);
  target?.props.onChange('players');
  expect(manage).not.toHaveBeenCalled();
});

it('removes the text resize grip only in the preview', () => {
  const question = { ...newQuestion('f', 0), type: 'text' as const };
  expect(renderToStaticMarkup(createElement(QuestionField, { question, locale: 'en', preview: true }))).toContain('resize-none');
  expect(renderToStaticMarkup(createElement(QuestionField, { question, locale: 'en' }))).not.toContain('resize-none');
});

it('opens the existing schedule manager from both the recurrence and specific-player choices', () => {
  const manage = vi.fn();
  const tree = ScheduleEditor({ form: copyTemplate(templates[0], 'captain'), locale: 'en', onChange() {}, onManage: manage });
  const selects = elements<Parameters<typeof ThemedSelect>[0]>(tree, ThemedSelect);
  const recurrence = selects.find(s => s.props.options.some(o => o.value === 'advanced'));
  expect(recurrence).toBeDefined();
  recurrence?.props.onChange('advanced');
  const target = selects.find(s => s.props.options.some(o => o.value === 'players'));
  expect(target?.props.options.find(o => o.value === 'players')?.label).toBe('Specific players');
  target?.props.onChange('players');
  expect(manage).toHaveBeenCalledTimes(2);
});
