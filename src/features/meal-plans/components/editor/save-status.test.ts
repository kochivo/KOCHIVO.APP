import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerEditor } from './player-editor';

const state = vi.hoisted(() => ({
  draft: { id: 'plan', playerId: null, title: 'Plan', status: 'draft' as const,
    meals: [], targets: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },
  loading: false, error: '', busy: false, dirty: false,
  update: vi.fn(), reload: vi.fn(), persist: vi.fn(), retrySave: vi.fn(),
}));
vi.mock('../../hooks/use-plan-draft', () => ({ usePlanDraft: () => state }));
vi.mock('../../hooks/use-editor-autosave', () => ({ useEditorAutosave: () => {} }));
vi.mock('../../data/editor-context', () => ({ loadEditorContext: vi.fn() }));
vi.mock('../meal-editor', () => ({ MealEditor: () => null }));
vi.mock('../../data/player-editor', () => ({ savePlayerEditor: vi.fn(), createReplacementPlan: vi.fn() }));
vi.mock('../../data/foods', () => ({ searchFoods: vi.fn() }));

it.each([
  { busy: false, dirty: false, error: '', expected: 'Saved' },
  { busy: true, dirty: true, error: '', expected: 'Saving…' },
  { busy: false, dirty: true, error: 'Save failed', expected: 'Save failed' },
])('renders the save status for %j', ({ busy, dirty, error, expected }) => {
  Object.assign(state, { busy, dirty, error });
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(PlayerEditor, { data: { draft: state.draft, context: { facts: {}, name: '', today: '', logs: [] }, plans: [], fresh: false } })));
  expect(html).toContain(expected);
  if (error) expect(html).toContain('Retry');
  expect(html).toContain('value="Plan"');
  expect(html).not.toContain('Send to player');
  expect(html).not.toContain('data-adherence=');
});
