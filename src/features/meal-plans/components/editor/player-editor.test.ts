import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerEditor } from './player-editor';
import { PlayerEditorEntry } from './player-entry';
import type { loadPlayerEditor } from '../../data/player-editor';

vi.mock('../../data/player-editor', () => ({ savePlayerEditor: vi.fn(), createReplacementPlan: vi.fn() }));
vi.mock('../../data/foods', () => ({ searchFoods: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../hooks/use-editor-autosave', () => ({ useEditorAutosave: () => {} }));
vi.mock('../../hooks/use-plan-draft', () => ({ usePlanDraft: (_id: string, options: { initialDraft: unknown }) => ({
  draft: options.initialDraft, error: '', dirty: false, busy: false, update: vi.fn(), persist: vi.fn(), retrySave: vi.fn(),
}) }));
const data: Awaited<ReturnType<typeof loadPlayerEditor>> = {
  fresh: false, plans: [], context: { name: 'Ali', today: '2026-11-12', facts: {}, logs: [] },
  draft: { id: 'p', playerId: 'player', title: 'Old name', status: 'draft',
    targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 },
    meals: [{ id: 'meal', name: 'Breakfast', position: 1, items: [{ id: 'item', grams: 150, position: 1,
      alternatives: [], food: { id: 'egg', name: 'بيض', nameEn: 'Egg', custom: false, photo: null,
        kcal: 156, protein: 12, carbs: 1, fat: 10, units: [{ key: 'egg', name_ar: 'حباية', name_en: 'egg', grams: 50 }] } }] }] },
};
it.each(['ar', 'en'] as const)('renders the player editor in %s with one primary action and no name/save form', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(PlayerEditor, { data })));
  expect(html).toContain(locale === 'ar' ? 'ابعت للاعب' : 'Send to player');
  expect(html).toContain(locale === 'ar' ? 'أكل Ali' : 'Ali’s meal plan');
  expect(html).not.toContain('value="Old name"');
  expect(html).toContain(locale === 'ar' ? 'اتحفظ' : 'Saved');
  expect(html).not.toContain('احفظ');
  expect(html.match(/primary-surface/g)).toHaveLength(1);
  expect(html).toContain('value="3"');
  expect(html).toContain('234');
  expect(html.match(/data-target=/g)).toHaveLength(4);
  expect(html.match(/data-adherence=/g)).toHaveLength(7);
  expect(html).toContain('grid-cols-[minmax(0,1fr)_150px_48px]');
  expect(html).toContain('type="search"');
  expect(html).toContain('disabled=""');
});
it('remounts editor state when navigation supplies another plan', () => {
  expect(PlayerEditorEntry({ data }).key).toBe('p');
  expect(PlayerEditorEntry({ data: { ...data, draft: { ...data.draft, id: 'next' } } }).key).toBe('next');
});
