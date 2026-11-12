import { createElement } from 'react';
import type * as React from 'react';
import type * as Templates from '@/features/templates';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { emptyWarmup } from './warmup';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { ProgramBuilder } from './components/program-builder';
import { DayEditor } from './components/day-editor';
import { ExercisePicker } from './components/exercise-picker';
vi.mock('@/features/templates', async original => ({ ...await original<typeof Templates>(), SaveTemplateButton: () => null }));
vi.mock('./data/program-io', () => ({ createProgram() {}, listPlayerPrograms() {} }));
vi.mock('./data/activate', () => ({ activateProgram() {} }));
vi.mock('./data/library', () => ({ searchExercises() {} }));
vi.mock('./data/custom-exercise', () => ({ createCustomExercise() {}, updateCustomExercise() {}, deleteCustomExercise() {} }));
vi.mock('./hooks/use-program-draft', () => ({ useProgramDraft: () => ({ loading: false, draft: { id: 'p', title: 'Plan', settings: {}, days: [], player_id: 'player' }, update() {} }) }));
it('links empty player programs to templates', () => {
 state.values = ['', '', false, '', { data: [] }, 0, 0];
 expect(render(createElement(ProgramBuilder, { playerId: 'player' }))).toMatch(/href="\/captain\/templates"[^>]*>Or start from a template<\/a>/);
});
it('offers adding the first day inside the empty state', () => {
 const html = render(createElement(ProgramBuilder));
 expect(html).toContain('<h2 class="text-xl font-bold">Add the first day</h2>');
 expect(html).toContain('>+ Add training day</button>');
});
it('offers the exercise library inside an empty day', () => {
 const html = render(createElement(DayEditor, { day: { id: 'd', program_id: 'p', title: 'Day', position: 1, exercises: [], warmup: emptyWarmup() }, update() {} }));
 expect(html).toContain('<h2 class="text-xl font-bold">Add the first exercise</h2>');
 expect(html).toContain('>+ Add exercise</button>');
});
it('offers resetting empty exercise search results', () => {
 state.values = ['missing', '', 0, { data: [] }, '["missing","",0]'];
 expect(render(createElement(ExercisePicker, { disabled: false, onAdd() {} }))).toContain('>Clear search and filters</button>');
});
