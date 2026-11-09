import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { generateProgram } from './generate';
import { patterns } from './pick';
import type { Candidate } from './pick';
import type { GeneratorBrief } from './brief';
import { initialBrief, swapExercise, regenerateWeek, alternativesFor } from './hooks/use-generator';
import { BriefSheet } from './components/brief-sheet';
import { GeneratedWeek } from './components/generated-week';
import { SwapSheet, dismissNested } from './components/swap-sheet';
import { messages } from './messages';
import { saveGenerated } from './data/save-generated';
import { GenerateButton } from './components/generate-button';

const actions = vi.hoisted(() => ({ create: vi.fn(), template: vi.fn(), save: vi.fn(), activate: vi.fn() }));
const state = vi.hoisted(() => ({ overrides: new Map<number, unknown>(), index: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => {
    const pair = react.useState(initial);
    const index = state.index++;
    return state.overrides.has(index) ? [state.overrides.get(index), pair[1]] : pair;
  } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), unstable_rethrow: () => {} }));
vi.mock('@/features/programs', () => ({ createProgram: actions.create, saveProgram: actions.save, activateProgram: actions.activate }));
vi.mock('@/features/templates', () => ({ createTemplate: actions.template }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
const brief: GeneratorBrief = { goal: 'muscle', level: 'beginner', weekdays: [0, 2, 4],
  minutes: 60, equipment: 'gym', injuries: [], seed: 42 };
const candidates: Candidate[] = patterns.flatMap((pattern, p) => Array.from({ length: 9 }, (_, i) => {
  const id = `00000000-0000-7000-8000-${String(p * 9 + i).padStart(12, '0')}`;
  return { exercise_id: id, pattern, kind: p < 7 ? 'compound' : 'isolation', equipment: 'bodyweight', stress: [],
    min_level: 'beginner', usage: 0, library: { id, name_ar: 'تمرين تجريبي', name_en: 'Test exercise',
      media_path: null, body_part: 'chest', equipment: 'bodyweight' } };
}));
function week() {
  const result = generateProgram(brief, candidates);
  if (result.error) throw new Error(result.error.code);
  return result.data;
}
function render(locale: Locale, element: ReturnType<typeof createElement>) {
  state.index = 0;
  return renderToStaticMarkup(createElement(LocaleProvider, { locale }, element));
}
beforeEach(() => {
  state.overrides.clear();
  vi.clearAllMocks(); actions.create.mockResolvedValue({ data: 'program-id' });
  actions.template.mockResolvedValue({ data: 'template-id' });
  actions.save.mockResolvedValue({ ok: true, data: true }); actions.activate.mockResolvedValue({ ok: true, data: true });
});
it('prefills intake weekdays in Saturday-first order and maps experience and duration', () => {
  expect(initialBrief({ trainingDays: [0, 6, 2], experience: 'over_3y', sessionMinutes: 45, injuries: ['knee', 'none'] }, 7))
    .toMatchObject({ weekdays: [0, 1, 3], level: 'advanced', minutes: 45, injuries: ['knee'], seed: 7 });
  expect(initialBrief({ trainingDays: [0], sessionMinutes: 30 }, 8).weekdays).toEqual([0, 2, 4]);
});
it('swaps only one slot, rejects invalid or duplicated choices and supports swapping back', () => {
  const generated = week(); const row = generated.days[0]?.exercises[0];
  if (!row) throw new Error('fixture');
  const alternate = alternativesFor(generated, 0, row.position, candidates)[0];
  if (!alternate) throw new Error('fixture');
  const swapped = swapExercise(generated, brief, candidates, 0, row.position, alternate.exercise_id);
  expect(swapped.days.slice(1)).toEqual(generated.days.slice(1));
  expect(swapped.days[0]?.exercises.slice(1)).toEqual(generated.days[0]?.exercises.slice(1));
  expect(swapped.days[0]?.exercises[0]?.exercise_id).toBe(alternate.exercise_id);
  expect(swapExercise(generated, brief, candidates, 0, row.position, 'invalid')).toBe(generated);
  expect(swapExercise(swapped, brief, candidates, 0, row.position, row.exercise_id)).toEqual(generated);
});
it('regenerates deterministically and retains manual swaps only with explicit confirmation', () => {
  const generated = week(); const row = generated.days[0]?.exercises[0];
  const id = row?.alternatives[0]; if (!row || !id) throw new Error('fixture');
  const swaps = [{ weekday: 0, position: row.position, exerciseId: id }];
  const changed = regenerateWeek(brief, candidates, generated, swaps, false);
  expect(changed.brief.seed).toBe(43); expect(changed.program).not.toEqual(generated);
  expect(changed.swaps).toEqual([]);
  expect(regenerateWeek(brief, [...candidates].reverse(), generated, swaps, false)).toEqual(changed);
  expect(regenerateWeek(brief, candidates, generated, swaps, true).program?.days[0]?.exercises[0]?.exercise_id).toBe(id);
});
it('does not retain an unsafe manual swap or introduce a duplicate exercise after regeneration', () => {
  const generated = week(); const row = generated.days[0]?.exercises[0];
  const id = row?.alternatives[0]; if (!row || !id) throw new Error('fixture');
  const swaps = [{ weekday: 0, position: row.position, exerciseId: id }];
  const restricted = candidates.map(candidate => candidate.exercise_id === id ? { ...candidate, stress: ['knee'] as const } : candidate)
    .map(candidate => ({ ...candidate, stress: [...candidate.stress] }));
  const next = regenerateWeek({ ...brief, injuries: ['knee'] }, restricted, generated, swaps, true);
  expect(next.swaps).toEqual([]);
  expect(next.program.days.flatMap(day => day.exercises).map(row => row.exercise_id)).not.toContain(id);
  for (const day of next.program.days) expect(new Set(day.exercises.map(row => row.exercise_id)).size).toBe(day.exercises.length);
});
it.each(['ar', 'en'] as const)('renders brief, tabs, translated swap labels and empty/loading/error states in %s', locale => {
  const t = createT(messages, locale);
  const form = render(locale, createElement(BriefSheet, { brief, playerName: 'Sam', onChange: vi.fn(), onGenerate: vi.fn(), onClose: vi.fn() }));
  expect(form).toContain('Sam'); expect(form).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
  expect(form.indexOf(t('sat'))).toBeLessThan(form.indexOf(t('sun')));
  const props = { program: week(), onSwap: vi.fn() };
  const preview = render(locale, createElement(GeneratedWeek, props));
  expect(preview).toContain('role="tablist"'); expect(preview).toContain(t('swap'));
  expect(preview).toContain(locale === 'ar' ? 'تمرين تجريبي' : 'Test exercise');
  for (const [patch, key] of [[{ loading: true }, 'loading'], [{ error: true }, 'unfilled'], [{ program: null }, 'empty']] as const)
    expect(render(locale, createElement(GeneratedWeek, { ...props, ...patch }))).toContain(t(key));
  expect(render(locale, createElement(SwapSheet, { alternatives: [], onSelect: vi.fn(), onClose: vi.fn() }))).toContain(t('noAlternatives'));
});
it.each(['ar', 'en'] as const)('renders actual entry loading, error and empty catalog states in %s', locale => {
  const t = createT(messages, locale);
  state.overrides.set(0, true);
  expect(render(locale, createElement(GenerateButton))).toContain(t('loading'));
  state.overrides.set(2, true);
  expect(render(locale, createElement(GenerateButton))).toContain(t('loadError'));
  state.overrides.set(2, false); state.overrides.set(1, []);
  expect(render(locale, createElement(GenerateButton))).toContain(t('empty'));
});
it('requires a successful profile load before offering the player brief or assignment', () => {
  state.overrides.set(0, true);
  const html = render('en', createElement(GenerateButton, { playerId: 'player', profileError: true, candidates }));
  expect(html).toContain('Could not load the player profile');
  expect(html).not.toContain('Training days'); expect(html).not.toContain('Assign to');
});
it('closes only the nested sheet on Escape and leaves other keys alone', () => {
  const close = vi.fn(); const stopPropagation = vi.fn(); const preventDefault = vi.fn();
  dismissNested({ key: 'Enter', stopPropagation, preventDefault }, close);
  expect(close).not.toHaveBeenCalled(); expect(stopPropagation).not.toHaveBeenCalled();
  dismissNested({ key: 'Escape', stopPropagation, preventDefault }, close);
  expect(close).toHaveBeenCalledTimes(1); expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(preventDefault).toHaveBeenCalledTimes(1);
});
it('limits reason chips to two captain-facing explanations', () => {
  const generated = week(); const first = generated.days[0]?.exercises[0];
  if (!first) throw new Error('fixture');
  first.reasons = ['injury_safe_knee', 'replaced_for_knee', 'captain_favorite'];
  const html = render('en', createElement(GeneratedWeek, { program: generated, onSwap: vi.fn() }));
  expect(html).toContain('Knee-safe'); expect(html).toContain('Replaced for knee'); expect(html).not.toContain('Your favorite');
});
it('creates and saves a draft before activation; edit mode never activates', async () => {
  const generated = { ...week(), player_id: '00000000-0000-7000-8000-000000000999' };
  expect(await saveGenerated(generated, 'Week', 'assign')).toEqual({ data: 'program-id' });
  expect(actions.create).toHaveBeenCalledWith(generated.player_id, 'Week');
  expect(actions.save.mock.invocationCallOrder[0]).toBeLessThan(actions.activate.mock.invocationCallOrder[0] ?? 0);
  expect(actions.save.mock.calls[0]?.[0]).toMatchObject({ status: 'draft', title: 'Week' });
  actions.activate.mockClear();
  await saveGenerated(generated, 'Week', 'edit', 'program-id');
  expect(actions.create).toHaveBeenCalledTimes(1); expect(actions.activate).not.toHaveBeenCalled();
});
it('saves templates through the existing path and stops on failure, reusing the draft on retry', async () => {
  actions.save.mockResolvedValueOnce({ ok: false, error: 'save failed' });
  expect(await saveGenerated(week(), 'Week', 'template')).toEqual({ error: 'save failed', programId: 'template-id' });
  expect(actions.activate).not.toHaveBeenCalled();
  expect(await saveGenerated(week(), 'Week', 'template', 'template-id')).toEqual({ data: 'template-id' });
  expect(actions.template).toHaveBeenCalledTimes(1); expect(actions.create).not.toHaveBeenCalled();
  actions.create.mockResolvedValueOnce({ error: 'create failed' });
  expect(await saveGenerated({ ...week(), player_id: 'player' }, 'Week', 'assign')).toEqual({ error: 'create failed' });
});
it('reports activation failures with the draft id and preserves retry ordering', async () => {
  const generated = { ...week(), player_id: 'player' };
  actions.activate.mockResolvedValueOnce({ ok: false, error: 'activation failed' });
  expect(await saveGenerated(generated, 'Week', 'assign')).toEqual({ error: 'activation failed', programId: 'program-id' });
  expect(await saveGenerated(generated, 'Week', 'assign', 'program-id')).toEqual({ data: 'program-id' });
  expect(actions.create).toHaveBeenCalledTimes(1); expect(actions.save).toHaveBeenCalledTimes(2);
  actions.save.mockRejectedValueOnce(new Error('offline'));
  expect(await saveGenerated(generated, 'Week', 'assign', 'program-id')).toEqual({ error: messages.en.saveError, programId: 'program-id' });
  expect(actions.activate).toHaveBeenCalledTimes(2);
});
