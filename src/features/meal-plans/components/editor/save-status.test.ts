import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { EditorEntry } from '../editor-entry';

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

it.each([
  { busy: false, dirty: false, error: '', expected: '' },
  { busy: true, dirty: true, error: '', expected: 'Saving…' },
  { busy: false, dirty: true, error: 'Save failed', expected: 'Save failed' },
])('renders the save status for %j', ({ busy, dirty, error, expected }) => {
  Object.assign(state, { busy, dirty, error });
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(EditorEntry, { planId: 'plan' })));
  const status = html.match(/<div role="status"[^>]*>(.*?)<\/div>/)?.[1];
  expect(status).toBeDefined();
  if (expected) expect(status).toContain(expected);
  else expect(status).toBe('');
  if (error) expect(status).toContain('Try again');
});
