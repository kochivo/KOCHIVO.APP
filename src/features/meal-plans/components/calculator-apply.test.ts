import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { CalculatorApply, applyCalculatorTargets } from './calculator-apply';
import { CalculatorField } from './calculator-field';
import { CalculatorView, calculatorResult, initialCalculatorGoal, initialCalculatorValues } from './calculator-view';
import { CalculatorResults } from './calculator-results';
import { messages } from './calculator/messages';
import type { PlanDraft } from '../types';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, load: vi.fn(), save: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useId: () => 'field',
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('next/link', () => ({ default: ({ children }: { children: ReactNode }) => createElement('a', null, children) }));
vi.mock('../data/plan-io', () => ({ loadPlan: state.load, savePlan: state.save }));
const targets = { kcal: 2244, protein: 164, fat: 62, carbs: 258 };
const draft: PlanDraft = { id: 'plan', playerId: 'player', title: 'Existing plan', status: 'active',
  targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 },
  meals: [{ id: 'meal', name: 'Existing meal', position: 1, items: [] }] };
const plans = [{ id: 'plan', title: 'Existing plan', status: 'active' }];
function RenderApply() {
  state.index = 0;
  return CalculatorApply({ playerId: 'player', plans, targets });
}
function handler(node: ReactNode, event: string): () => unknown {
  if (Array.isArray(node)) {
    for (const child of node) { try { return handler(child, event); } catch { /* Search siblings. */ } }
  } else if (isValidElement<Record<string, unknown>>(node)) {
    const value = node.props[event];
    if (typeof value === 'function') return value as () => unknown;
    return handler(node.props.children as ReactNode, event);
  }
  throw new Error('Handler not found');
}
beforeEach(() => {
  vi.resetAllMocks(); state.values = []; state.index = 0;
  state.load.mockResolvedValue({ ok: true, data: draft });
  state.save.mockResolvedValue({ ok: true, data: undefined });
});
it('saves only average targets while preserving the existing meals and plan metadata', async () => {
  await applyCalculatorTargets('plan', 'player', targets);
  expect(state.save).toHaveBeenCalledWith({ ...draft, targets });
});
it.each(['archived', 'another-player'])('does not save an unavailable %s plan', async value => {
  state.load.mockResolvedValue({ ok: true, data: { ...draft,
    ...(value === 'archived' ? { status: 'archived' } : { playerId: value }) } });
  expect((await applyCalculatorTargets('plan', 'player', targets)).ok).toBe(false);
  expect(state.save).not.toHaveBeenCalled();
});
it('reports a failed plan read without attempting to save', async () => {
  state.load.mockResolvedValue({ ok: false, error: 'unavailable' });
  expect((await applyCalculatorTargets('plan', 'player', targets)).ok).toBe(false);
  expect(state.save).not.toHaveBeenCalled();
});
it('shows targets optimistically before the network resolves, then confirms them', async () => {
  let resolveSave: (result: { ok: true; data: undefined }) => void = () => {};
  state.save.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  handler(RenderApply(), 'onClick')();
  expect(renderToStaticMarkup(RenderApply())).toContain('Targets updated locally. Saving');
  expect(renderToStaticMarkup(RenderApply())).toContain('2,244 kcal');
  await Promise.resolve();
  resolveSave({ ok: true, data: undefined });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(renderToStaticMarkup(RenderApply())).toContain('Targets saved');
});
it.each(['returned', 'thrown'])('rolls back optimistic feedback after a %s save failure and allows retry', async failure => {
  if (failure === 'returned') state.save.mockResolvedValueOnce({ ok: false, error: 'failure' });
  else state.save.mockRejectedValueOnce(new Error('network'));
  handler(RenderApply(), 'onClick')();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  const html = renderToStaticMarkup(RenderApply());
  expect(html).toContain('Could not save targets');
  expect(html).not.toContain('Targets saved');
  handler(RenderApply(), 'onClick')();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(renderToStaticMarkup(RenderApply())).toContain('Targets saved');
});
it('opens an inline number input for a missing fact and keeps the edit local', () => {
  const onChange = vi.fn();
  const render = () => { state.index = 0; return CalculatorField({ label: 'Body fat (%)', onChange }); };
  expect(renderToStaticMarkup(render())).toContain('Add');
  handler(render(), 'onClick')();
  expect(renderToStaticMarkup(render())).toContain('inputMode="decimal"');
  const input = render();
  const change = handler(input, 'onCommit') as (value: number) => void;
  change(20);
  expect(onChange).toHaveBeenCalledWith(20);
  expect(state.save).not.toHaveBeenCalled();
});
it('prefills activity from the player facts and withholds results until missing data is added', () => {
  const values = initialCalculatorValues({ history: [], facts: {
    trainingDays: { key: 'trainingDays', value: [0, 2, 4, 6], source: { kind: 'intake', id: 'p', at: '2026-11-10' }, isNew: false },
  } });
  expect(values.trainingDays).toBe(4);
  expect(calculatorResult(values, 'cut', .5)).toBeNull();
  expect(calculatorResult({ ...values, weightKg: 82, heightCm: 178, age: 27, sex: 'male', sessionMinutes: 60 }, 'cut', .5)?.targets).toEqual(targets);
});
it('asks for an intake update without exposing the apply action when body data is absent', () => {
  const html = renderToStaticMarkup(CalculatorView({ playerId: 'player', file: { facts: {}, history: [] }, plans }));
  expect(html).toContain('Ask the player to update their data');
  expect(html).not.toContain('Apply to meal plan');
});
it('changes only carbs between training and rest previews', () => {
  const html = renderToStaticMarkup(createElement(CalculatorResults, {
    result: { bmr: 1803, tdee: 2794, target: 2244 }, weightKg: 82, trainingDays: 4, split: true, onSplit() {},
  }));
  expect(html).toContain('2,420 kcal');
  expect(html).toContain('2,010 kcal');
  expect(html.match(/164 g/g)).toHaveLength(3);
  expect(html.match(/62 g/g)).toHaveLength(3);
  expect(html).toContain('302 g');
  expect(html).toContain('199 g');
});
it.each([[90, 'bulk'], [75, 'cut'], [82, 'maintain']])('prefills the goal from a target weight of %s', (targetWeight, expected) => {
  const source = { kind: 'intake', id: 'player', at: '2026-11-10T12:00:00Z' };
  expect(initialCalculatorGoal({ history: [], facts: {
    weight: { key: 'weight', value: 82, source, isNew: false },
    targetWeight: { key: 'targetWeight', value: Number(targetWeight), source, isNew: false },
  } })).toBe(expected);
});
it('uses one daily target when a split would require negative carbs', () => {
  const html = renderToStaticMarkup(createElement(CalculatorResults, {
    result: { bmr: 1803, tdee: 3109, target: 1803 }, weightKg: 82, trainingDays: 6, split: true, onSplit() {},
  }));
  expect(html).not.toContain('Carbs -');
  expect(html).toContain('Split unavailable');
  expect(html).toContain('aria-checked="false"');
});
