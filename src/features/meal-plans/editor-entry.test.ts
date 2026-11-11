import { afterEach, expect, it, vi } from 'vitest';
import { PlanBuilderEntry } from './components/plan-builder-entry';
import { PlanBuilder } from './components/plan-builder';
import { EditorEntry } from './components/editor-entry';
import { createElement } from 'react';
vi.mock('./components/plan-builder', () => ({ PlanBuilder: () => null }));
vi.mock('./components/editor-entry', () => ({ EditorEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());
it.each(['', '0', 'true'])('retains the legacy builder with flag %s', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  expect(PlanBuilderEntry({ planId: 'p' })).toEqual(createElement(PlanBuilder, { planId: 'p' }));
});
it('selects the editor only for the enabled flag', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(PlanBuilderEntry({ planId: 'p' })).toEqual(createElement(EditorEntry, { planId: 'p' }));
});
