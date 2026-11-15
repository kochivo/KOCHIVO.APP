import { isValidElement } from 'react';
import type * as React from 'react';
import type * as Navigation from 'next/navigation';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { ProgramDraft } from '@/features/programs';
import type * as Programs from '@/features/programs';
import { TrainingEditor } from './training-editor';
import { WeekMenu } from './week-menu';
import { EditorHeader } from './editor-header';

vi.mock('server-only', () => ({}));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => [initial, state.set],
  useCallback: (callback: unknown) => callback, useRef: (initial: unknown) => ({ current: initial }), useEffect: () => {},
}));
vi.mock('next/navigation', async original => ({ ...await original<typeof Navigation>(),
  useSearchParams: () => new URLSearchParams(), usePathname: () => '/captain/templates/p/edit',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
const state = vi.hoisted(() => ({ update: vi.fn(), flush: vi.fn(), activate: vi.fn(), set: vi.fn() }));
const draft: ProgramDraft = { id: 'template', player_id: null, title: 'Template', status: 'draft', days: [] };
vi.mock('@/features/programs', async original => ({ ...await original<typeof Programs>(),
  activateProgram: state.activate,
  useTrainingAutosave: (initial: ProgramDraft) => ({ draft: initial, update: state.update, flush: state.flush, status: 'saved', error: '' }),
}));
function nodes(value: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
beforeEach(() => { vi.clearAllMocks(); state.flush.mockResolvedValue(true); });
it('blocks empty assignment with an inline message before saving or opening the sheet', () => {
  const header = nodes(TrainingEditor({ mode: 'template', initial: draft, programs: [] })).find(node => node.type === EditorHeader);
  (header?.props.onAssign as () => void)();
  expect(state.set).toHaveBeenCalledWith('Add at least one exercise first');
  expect(state.flush).not.toHaveBeenCalled();
});
it('offers one start card that restores and selects the first day', () => {
  const rest = { ...draft, days: [{ id: 'first', program_id: draft.id, title: '', position: 1, is_rest_day: true, warmup: { items: [], ramp: false }, exercises: [] }] };
  const tree = nodes(TrainingEditor({ mode: 'template', initial: rest, programs: [] }));
  const start = tree.find(node => Array.isArray(node.props.children) && node.props.children.includes('Start the first training day') && typeof node.props.onClick === 'function');
  expect(start).toBeDefined();
  (start?.props.onClick as () => void)();
  const operation = state.update.mock.calls[0]?.[0] as (current: ProgramDraft) => ProgramDraft;
  expect(operation(rest).days[0]?.is_rest_day).toBe(false);
  expect(state.set).toHaveBeenCalledWith('first');
});
it('passes template edits to the shared quiet autosave queue', () => {
  const tree = TrainingEditor({ mode: 'template', initial: draft, programs: [] });
  const menu = nodes(tree).find(node => node.type === WeekMenu);
  expect(menu).toBeDefined();
  const update = menu?.props.update as (operation: (current: ProgramDraft) => ProgramDraft) => void;
  update(current => ({ ...current, title: 'Renamed template' }));
  expect(state.update).toHaveBeenCalledOnce();
  const operation = state.update.mock.calls[0]?.[0] as (current: ProgramDraft) => ProgramDraft;
  expect(operation(draft)).toEqual({ ...draft, title: 'Renamed template' });
});
it('flushes template save without activating a player plan', async () => {
  const tree = TrainingEditor({ mode: 'template', initial: draft, programs: [] });
  const save = nodes(tree).find(node => node.type === EditorHeader);
  expect(save).toBeDefined();
  const click = save?.props.onRetry as () => void;
  click();
  expect(state.flush).toHaveBeenCalledOnce();
  expect(state.activate).not.toHaveBeenCalled();
});
