import { beforeEach, expect, it, vi } from 'vitest';
import { createReplacementPlan, loadPlayerEditor, savePlayerEditor } from './data/player-editor';

const mocks = vi.hoisted(() => ({ list: vi.fn(), load: vi.fn(), save: vi.fn(), context: vi.fn(), upsert: vi.fn(), user: vi.fn() }));
const playerId = '00000000-0000-4000-8000-000000000001';
vi.mock('@/core/i18n/server', async () => {
  const { createT } = await import('@/core/i18n/messages');
  return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') };
});
vi.mock('./data/editor-context', () => ({ loadEditorContext: mocks.context }));
vi.mock('./data/plan-io', () => ({ listPlayerPlans: mocks.list, loadPlan: mocks.load, savePlan: mocks.save }));
vi.mock('./data/client', () => ({ planClient: async () => ({ auth: { getUser: mocks.user }, from: () => ({ upsert: mocks.upsert }) }) }));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ ok: true, data: [] });
  mocks.context.mockResolvedValue({ name: 'Ali', facts: {}, today: '2026-11-12', logs: [] });
  mocks.user.mockResolvedValue({ data: { user: { id: 'captain' } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.save.mockResolvedValue({ ok: true });
});
it('opens an automatically named draft without a database write', async () => {
  const result = await loadPlayerEditor(playerId);
  expect(result.draft.title).toBe('نظام أكل Ali');
  expect(result.fresh).toBe(true);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it('reuses a draft before the active plan and never replaces saved target overrides', async () => {
  mocks.list.mockResolvedValue({ ok: true, data: [{ id: 'active', status: 'active' }, { id: 'draft', status: 'draft' }] });
  mocks.load.mockResolvedValue({ ok: true, data: { id: 'draft', targets: { kcal: 2100 } } });
  const result = await loadPlayerEditor('player');
  expect(mocks.load).toHaveBeenCalledWith('draft');
  expect(result.draft.targets.kcal).toBe(2100);
  expect(result.fresh).toBe(false);
});
it('inserts a plan idempotently on the first save, then uses the existing RPC save path', async () => {
  const { draft } = await loadPlayerEditor(playerId);
  expect(await savePlayerEditor(draft)).toEqual({ ok: true });
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: draft.id, title: 'نظام أكل Ali' }), { onConflict: 'id', ignoreDuplicates: true });
  expect(mocks.save).toHaveBeenCalledWith(draft);
});
it('preserves input and stops on an insertion failure', async () => {
  const { draft } = await loadPlayerEditor(playerId);
  mocks.upsert.mockResolvedValue({ error: { message: 'failure' } });
  expect((await savePlayerEditor(draft)).ok).toBe(false);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(draft.title).toBe('نظام أكل Ali');
});
it('rejects the workspace data path when the flag is disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(loadPlayerEditor('player')).rejects.toThrow('Workspace disabled');
  expect(mocks.list).not.toHaveBeenCalled();
});
it('validates the complete draft before inserting anything', async () => {
  const { draft } = await loadPlayerEditor(playerId);
  expect((await savePlayerEditor({ ...draft, targets: { ...draft.targets, kcal: -1 } })).ok).toBe(false);
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it('creates an automatically named blank replacement without touching the active plan', async () => {
  const result = await createReplacementPlan(playerId);
  expect(result.ok).toBe(true);
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.load).not.toHaveBeenCalled();
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ playerId, title: 'نظام أكل Ali', status: 'draft', meals: [] }));
});
