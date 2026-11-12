import { isValidElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { ProgramDraft } from '@/features/programs';
import type * as Programs from '@/features/programs';
import { TrainingEditor } from './training-editor';

vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => [initial, vi.fn()] }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
const state = vi.hoisted(() => ({ update: vi.fn(), flush: vi.fn(), activate: vi.fn() }));
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
it('keeps template edits in the shared quiet autosave queue', () => {
  const tree = TrainingEditor({ mode: 'template', initial: draft, programs: [] });
  const input = nodes(tree).find(node => node.type === 'input' && node.props.value === 'Template');
  expect(input).toBeDefined();
  const change = input?.props.onChange as (event: { target: { value: string } }) => void;
  change({ target: { value: 'Renamed template' } });
  expect(state.update).toHaveBeenCalledOnce();
  const operation = state.update.mock.calls[0]?.[0] as (current: ProgramDraft) => ProgramDraft;
  expect(operation(draft)).toEqual({ ...draft, title: 'Renamed template' });
});
it('flushes template save without activating a player plan', async () => {
  const tree = TrainingEditor({ mode: 'template', initial: draft, programs: [] });
  const save = nodes(tree).find(node => Array.isArray(node.props.children) && node.props.children.includes('Save template'));
  expect(save).toBeDefined();
  const click = save?.props.onClick as () => void;
  click();
  expect(state.flush).toHaveBeenCalledOnce();
  expect(state.activate).not.toHaveBeenCalled();
});
