import { beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import { createT } from '@/core/i18n/messages';
import { useTemplateAssignment } from './hooks/use-template-assignment';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, assign: vi.fn(), success: vi.fn(), close: vi.fn(), lock: { current: false } }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useRef: () => state.lock,
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => {
      state.values[index] = typeof value === 'function' ? value(state.values[index]) : value;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('./data/templates', () => ({ assignTemplate: state.assign }));
vi.mock('./data/template-preview', () => ({ previewTemplate: async () => ({ data: { kind: 'nutrition', groups: [], kcal: 2100 } }) }));
const template = { id: 'template', kind: 'program' as const, starter: true, title: 'Template', count: 1, created_at: '' };
function RenderAssignment(kind: 'program' | 'nutrition' = 'program') { return useTemplateAssignment({ ...template, kind }, ['ali', 'omar'], state.close, { ali: 'Ali', omar: 'Omar' }); }
function render(kind: 'program' | 'nutrition' = 'program') { state.index = 0; return RenderAssignment(kind); }
beforeEach(() => { vi.resetAllMocks(); state.values = []; state.lock.current = false; state.assign.mockResolvedValue({ data: 'copy' }); });

it('selects multiple players and toggles select all', () => {
  render().toggle('ali'); render().toggle('omar');
  expect(render().selected).toEqual(['ali', 'omar']);
  render().selectAll(); expect(render().selected).toEqual([]);
  render().selectAll(); expect(render().selected).toEqual(['ali', 'omar']);
});
it('includes the existing meal preview calories in each successful assignment popup', async () => {
  render('nutrition').selectAll();
  await render('nutrition').assign();
  expect(state.success).toHaveBeenCalledWith({ title: 'Meal plan sent to Ali', detail: 'Template · 2,100 kcal', icon: 'meal' });
  expect(state.success).toHaveBeenCalledWith({ title: 'Meal plan sent to Omar', detail: 'Template · 2,100 kcal', icon: 'meal' });
});
it('keeps successful assignments done and retries only failed players', async () => {
  state.assign.mockResolvedValueOnce({ data: 'copy' }).mockResolvedValueOnce({ error: 'denied' });
  render().selectAll(); await render().assign();
  expect(render().done).toEqual(['ali']);
  expect(render().failures).toEqual({ omar: 'denied' });
  expect(render().selected).toEqual(['omar']);
  expect(state.close).not.toHaveBeenCalled();
  render().toggle('ali'); expect(render().selected).toEqual(['omar']);
  await render().assign();
  expect(state.assign.mock.calls.map(call => call[0].playerId)).toEqual(['ali', 'omar', 'omar']);
  expect(render().done).toEqual(['ali', 'omar']);
  expect(state.success).toHaveBeenLastCalledWith({ title: 'Program sent to Omar', detail: 'Template', icon: 'program' });
  expect(state.close).toHaveBeenCalledOnce();
});
it('keeps rejected requests retryable and ignores duplicate submissions', async () => {
  render().selectAll();
  state.assign.mockRejectedValue(new Error('network'));
  await Promise.all([render().assign(), render().assign()]);
  expect(state.assign).toHaveBeenCalledTimes(2);
  expect(Object.keys(render().failures)).toEqual(['ali', 'omar']);
  expect(render().busy).toBe(false);
});
