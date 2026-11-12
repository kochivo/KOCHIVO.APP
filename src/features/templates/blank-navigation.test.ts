import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { Children, isValidElement } from 'react';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { TemplatesScreen } from './components/templates-screen';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, create: vi.fn(), push: vi.fn(),
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
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {} }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('./data/templates', () => ({ createTemplate: state.create }));
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
  state.values = [[], 'program', null, null, false];
});
afterEach(() => vi.unstubAllEnvs());
it('creates an enabled training template and opens the shared template editor', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.create.mockResolvedValue({ data: 'blank' });
  await sections()[0]?.props.onCreate();
  expect(state.push).toHaveBeenCalledWith('/captain/templates?plan=blank');
  expect(state.create).toHaveBeenCalledWith({ kind: 'program' });
});
it('creates an enabled nutrition template and opens the shared nutrition editor', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.values[1] = 'nutrition';
  state.create.mockResolvedValue({ data: 'meal-template' });
  await sections()[0]?.props.onCreate();
  expect(state.push).toHaveBeenCalledWith('/captain/nutrition/meal-template');
  expect(state.create).toHaveBeenCalledWith({ kind: 'nutrition' });
});
it.each([['program', '/captain/programs/blank'], ['nutrition', '/captain/nutrition/blank']])(
  'creates a blank %s template and opens its builder', async (kind, url) => {
    state.values[1] = kind;
    state.create.mockResolvedValue({ data: 'blank' });
    await sections()[0]?.props.onCreate();
    expect(state.push).toHaveBeenCalledWith(url);
    expect(state.create).toHaveBeenCalledWith({ kind });
  },
);
it('keeps creation failures visible without navigating', async () => {
  state.create.mockResolvedValue({ error: 'Could not create' });
  await sections()[0]?.props.onCreate();
  expect(state.values).toContain('Could not create');
  expect(state.push).not.toHaveBeenCalled();
});
