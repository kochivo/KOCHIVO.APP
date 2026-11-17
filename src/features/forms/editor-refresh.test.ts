import { beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { EditorSession } from './components/editor-session';
import { FormsLibraryEntry } from './components/forms-library-entry';
import { copyTemplate } from './model';
import { templates } from './templates';

const state = vi.hoisted(() => ({
  refs: [] as { current: unknown }[], index: 0,
  effects: [] as (() => void | (() => void))[], refresh: vi.fn(), replace: vi.fn(),
  save: undefined as undefined | ((form: ReturnType<typeof copyTemplate>) => Promise<void>),
}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
  useState: (value: unknown) => [value, () => {}],
  useRef: (current: unknown) => { const index = state.index++; return state.refs[index] ?? (state.refs[index] = { current }); },
  useCallback: (callback: unknown) => callback,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock('@/core/i18n/client', () => ({ useArabicStyle: () => 'egyptian' }));
vi.mock('./hooks/use-autosave', () => ({ useAutosave: (_form: unknown, save: typeof state.save) => {
  state.save = save; return { status: 'saved', retry() {} };
} }));
vi.mock('./data/save-form', () => ({ saveForm: async (form: unknown) => ({ ok: true, data: form }) }));

beforeEach(() => {
  state.refs = []; state.index = 0; state.effects = []; vi.clearAllMocks();
  vi.stubGlobal('window', { history: { replaceState: state.replace } });
});
it('keeps the URL after autosave without refreshing server data', async () => {
  const form = copyTemplate(templates[0], 'captain');
  EditorSession({ initial: form, locale: 'en', onBusy() {} });
  await state.save?.(form);
  expect(state.replace).toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
});
it('refreshes the list after the editor closes so saved names are reloaded', () => {
  const form = copyTemplate(templates[0], 'captain');
  FormsLibraryEntry({ form, locale: 'en' });
  state.effects.forEach(effect => effect());
  expect(state.refresh).not.toHaveBeenCalled();
  state.index = 0; state.effects = [];
  FormsLibraryEntry({ form: null, locale: 'en' });
  state.effects.forEach(effect => effect());
  expect(state.refresh).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
