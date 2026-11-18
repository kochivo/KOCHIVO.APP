import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { Children, isValidElement } from 'react';
import { createT } from '@/core/i18n/messages';
import type { messages } from './messages';
import { TemplatesScreen } from './components/templates-screen';
import type { Template } from './types';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, create: vi.fn(), copy: vi.fn(), push: vi.fn(),
  refs: [] as { current: unknown }[], refIndex: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useEffect() {},
  useRef: (initial: unknown) => {
    const index = state.refIndex++;
    return state.refs[index] ?? (state.refs[index] = { current: initial });
  },
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: (dictionary: typeof messages) => createT(dictionary, 'en'), useLocale: () => 'en' }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {} }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('./data/templates', () => ({ createTemplate: state.create, copyTemplate: state.copy }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => 'copy-placeholder' }));
vi.mock('@/features/program-generator', () => ({ GenerateButton: () => null }));
vi.mock('./data/template-preview', () => ({ previewTemplate: vi.fn() }));
function render() {
  state.index = 0; state.refIndex = 0;
  return TemplatesScreen();
}
function sections() {
  const { children } = render().props as { children: React.ReactNode };
  return Children.toArray(children).filter((child): child is React.ReactElement<{ onCreate: () => Promise<void> }> =>
    isValidElement<{ onCreate?: () => Promise<void> }>(child) && !!child.props.onCreate);
}
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  vi.resetAllMocks(); state.refs = [];
  vi.stubGlobal('window', { prompt: vi.fn(() => 'My plan') });
  state.values = [[], 'program', null, null, false];
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('creates an enabled training template and opens the shared template editor', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.create.mockResolvedValue({ data: 'blank' });
  await sections()[0]?.props.onCreate();
  expect(state.push).toHaveBeenCalledWith('/captain/templates?plan=blank');
  expect(state.create).toHaveBeenCalledWith({ kind: 'program', title: 'My plan' });
});
it('creates an enabled nutrition template and opens the shared nutrition editor', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.values[1] = 'nutrition';
  state.create.mockResolvedValue({ data: 'meal-template' });
  await sections()[0]?.props.onCreate();
  expect(state.push).toHaveBeenCalledWith('/captain/nutrition/meal-template');
  expect(state.create).toHaveBeenCalledWith({ kind: 'nutrition', title: 'My plan' });
});
it('edits a ready program by opening an owned copy in the shared builder', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.copy.mockResolvedValue({ data: 'editable-copy' });
  const template: Template = { id: 'ready', kind: 'program', title: 'Strength', starter: true, count: 3, created_at: '2026-11-14' };
  type View = { actions: (row: Template) => { onOpen: () => void; onCopyAndEdit: () => Promise<void> } };
  const view = Children.toArray(render().props.children as React.ReactNode).find((child): child is React.ReactElement<View> =>
    isValidElement<View>(child) && typeof child.props.actions === 'function');
  const actions = view?.props.actions(template);
  actions?.onOpen();
  expect(state.copy).not.toHaveBeenCalled();
  expect(state.push).not.toHaveBeenCalled();
  expect(state.values[3]).toBe(template);
  await actions?.onCopyAndEdit();
  expect(state.copy).toHaveBeenCalledWith({ kind: 'program', id: 'ready', title: 'Strength (copy)' });
  expect(state.push).toHaveBeenCalledWith('/captain/templates?plan=editable-copy');
});
it.each([['program', '/captain/programs/blank'], ['nutrition', '/captain/nutrition/blank']])(
  'creates a blank %s template and opens its builder', async (kind, url) => {
    state.values[1] = kind;
    state.create.mockResolvedValue({ data: 'blank' });
    await sections()[0]?.props.onCreate();
    expect(state.push).toHaveBeenCalledWith(url);
    expect(state.create).toHaveBeenCalledWith({ kind, title: 'My plan' });
  },
);
it('keeps creation failures visible without navigating', async () => {
  state.create.mockResolvedValue({ error: 'Could not create' });
  await sections()[0]?.props.onCreate();
  expect(state.values).toContain('Could not create');
  expect(state.push).not.toHaveBeenCalled();
});
it.each([null, '', '   '])('writes nothing when the name is canceled or empty: %s', async title => {
  vi.mocked(window.prompt).mockReturnValue(title);
  await sections()[0]?.props.onCreate();
  expect(state.create).not.toHaveBeenCalled();
  expect(state.push).not.toHaveBeenCalled();
});
