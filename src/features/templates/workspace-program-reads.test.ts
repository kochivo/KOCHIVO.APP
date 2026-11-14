import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { readWorkspacePrograms } from './components/workspace-program-reads';

const mocks = vi.hoisted(() => ({ list: vi.fn(), select: vi.fn(), from: vi.fn(), inside: vi.fn(), not: vi.fn() }));
vi.mock('./data/library', () => ({ listLibraryTemplates: mocks.list }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ from: mocks.from }) }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
const template = { id: 'p', title: 'Strength', kind: 'program', created_at: '2026-11-14', starter: false, count: 1, uses: 2 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ data: [template] });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ in: mocks.inside });
  mocks.inside.mockReturnValue({ not: mocks.not });
  mocks.not.mockResolvedValue({ data: [{ program_id: 'p', weekday: 1, is_rest_day: false }], error: null });
});
it('reads only saved weekday fields for the owned, visible template ids', async () => {
  mocks.list.mockResolvedValue({ data: [template, { ...template, id: 'archived', archived: true }] });
  const result = await readWorkspacePrograms();
  expect(result.data?.[0]).toMatchObject({ weekdays: [false, true, false, false, false, false, false] });
  expect(mocks.from).toHaveBeenCalledWith('program_days');
  expect(mocks.select).toHaveBeenCalledWith('program_id,weekday,is_rest_day');
  expect(mocks.inside).toHaveBeenCalledWith('program_id', ['p']);
  expect(mocks.not).toHaveBeenCalledWith('weekday', 'is', null);
});
it('surfaces weekday query failures instead of showing invented rest days', async () => {
  mocks.not.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
  expect(await readWorkspacePrograms()).toEqual({ error: "Couldn't load templates" });
});
it('does not query schedules when the template loader fails', async () => {
  mocks.list.mockResolvedValue({ error: 'Not signed in' });
  expect(await readWorkspacePrograms()).toEqual({ error: 'Not signed in' });
  expect(mocks.from).not.toHaveBeenCalled();
});
