import { beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { usePlanDraft as renderPlanDraft } from './hooks/use-plan-draft';
import type { PlanDraft } from './types';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0,
  refs: [] as { current: unknown }[], refIndex: 0,
  save: vi.fn(), activate: vi.fn(), success: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useEffect: () => {},
  useRef: (current: unknown) => {
    const index = state.refIndex++;
    return state.refs[index] ?? (state.refs[index] = { current });
  },
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'ar', useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('./data/plan-io', () => ({ savePlan: state.save, loadPlan: vi.fn() }));
vi.mock('./data/activate', () => ({ activatePlan: state.activate }));
const draft: PlanDraft = { id: 'plan', playerId: 'player', title: 'Plan', status: 'draft',
  targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [{ id: 'meal', name: 'Meal', position: 1,
    items: [{ id: 'item', position: 1, grams: 100, alternatives: [],
      food: { id: 'food', name: 'Food', photo: null, custom: false, kcal: 100, protein: 10, carbs: 10, fat: 1 } }] }] };
function RenderDraft(clearErrorsOnEdit = false) { return renderPlanDraft('plan', { clearErrorsOnEdit }); }
function render(clearErrorsOnEdit = false) { state.index = 0; state.refIndex = 0; return RenderDraft(clearErrorsOnEdit); }
beforeEach(() => {
  vi.resetAllMocks(); state.refs = []; state.values = [draft, '', '', false, false, 0, false];
  state.save.mockResolvedValue({ ok: true, data: undefined });
  state.activate.mockResolvedValue({ ok: true, data: undefined });
});
it('shows a generic translated error for a masked server exception', async () => {
  state.save.mockRejectedValue(new Error('Minified React error #441'));
  await render().persist();
  expect(render().error).toBe(createT(messages, 'ar')('couldntSaveTryAgain'));
  expect(state.success).not.toHaveBeenCalled();
});
it('saves a draft quietly without activating it', async () => {
  await render().persist();
  expect(state.save).toHaveBeenCalledWith(draft);
  expect(render().dirty).toBe(false);
  expect(render().error).toBe('');
  expect(state.activate).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
});
it('shows the rich saved popup after an explicit save and a successful retry', async () => {
  state.save.mockResolvedValueOnce({ ok: false, error: 'validation' });
  await render().persist(false, true);
  expect(state.success).not.toHaveBeenCalled();
  await render().retrySave();
  expect(state.success).toHaveBeenCalledWith(expect.objectContaining({ title: 'اتحفظ النظام', icon: 'meal', detail: expect.stringContaining('Plan') }));
});
it('shows a returned validation error and does not activate', async () => {
  state.save.mockResolvedValue({ ok: false, error: 'validation' });
  await render().persist(true);
  expect(render().error).toBe('validation');
  expect(state.activate).not.toHaveBeenCalled();
});
it('shows the returned activation error without changing draft status', async () => {
  state.activate.mockResolvedValue({ ok: false, error: 'ضيف وجبة وأكلة الأول' });
  await render().persist(true);
  expect(render().error).toBe('ضيف وجبة وأكلة الأول');
  expect(render().draft?.status).toBe('draft');
  expect(state.success).not.toHaveBeenCalled();
});
it('preserves the server rule allowing activation when at least one meal has food', async () => {
  state.values[0] = { ...draft, meals: [...draft.meals, { id: 'empty', name: 'Meal', position: 2, items: [] }] };
  await render().persist(true);
  expect(render().draft?.status).toBe('active');
  expect(state.activate).toHaveBeenCalledWith('plan');
  expect(state.success).toHaveBeenCalledWith(expect.objectContaining({ title: 'النظام وصل للاعب', icon: 'meal' }));
});
it.each([{ meals: [] }, { meals: [{ id: 'empty', name: 'Meal', position: 1, items: [] }] }])(
  'checks empty meals before saving or activating', async ({ meals }) => {
    state.values[0] = { ...draft, meals };
    await render().persist(true);
    expect(render().error).toBe('ضيف وجبة وأكلة الأول');
    expect(state.save).not.toHaveBeenCalled();
    expect(state.activate).not.toHaveBeenCalled();
    await render().retrySave();
    expect(render().error).toBe('ضيف وجبة وأكلة الأول');
    expect(state.save).not.toHaveBeenCalled();
  },
);
it('resumes enhanced autosave when a captain corrects a failed draft', async () => {
  state.save.mockResolvedValueOnce({ ok: false, error: 'validation' });
  await render(true).persist();
  expect(render(true).error).toBe('validation');
  render(true).update(value => ({ ...value, title: 'Corrected' }));
  expect(render(true).error).toBe('');
  expect(render(true).dirty).toBe(true);
  await render(true).persist();
  expect(state.save).toHaveBeenCalledTimes(2);
  expect(render(true).dirty).toBe(false);
});
it('preserves legacy error behavior on edits', () => {
  state.values[2] = 'validation';
  render().update(value => ({ ...value, title: 'Corrected' }));
  expect(render().error).toBe('validation');
});

it('keeps fields enabled during background saves and saves edits made while waiting', async () => {
  let finish: (value: { ok: true }) => void = () => {};
  state.save.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = render().persist();
  expect(render().busy).toBe(false);
  render().update(value => ({ ...value, title: 'Latest' }));
  const next = render().persist();
  expect(render().draft?.title).toBe('Latest');
  expect(state.save).toHaveBeenCalledTimes(1);
  finish({ ok: true }); await first; await next;
  expect(state.save).toHaveBeenLastCalledWith({ ...draft, title: 'Latest' });
  expect(render().dirty).toBe(false);
});

it('locks explicit Send until saving and activation finish', async () => {
  let finish: (value: { ok: true }) => void = () => {};
  state.save.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const send = render().persist(true, true);
  expect(render().busy).toBe(true);
  finish({ ok: true }); await send;
  expect(render().busy).toBe(false);
  expect(state.activate).toHaveBeenCalledOnce();
});
