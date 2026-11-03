import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignTemplate, deleteTemplate, listTemplatePlayers, listTemplates, renameTemplate, saveAsTemplate } from './data/templates';

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), single: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const client = { auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() };
  return { query, client, roster: vi.fn(), revalidate: vi.fn() };
});
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
vi.mock('@/features/roster', () => ({ fetchRoster: mocks.roster }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
const id = '01900000-0000-7000-8000-000000000001';
const playerId = '01900000-0000-7000-8000-000000000002';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.auth.getUser.mockResolvedValue({ data: { user: { id: 'captain' } }, error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  for (const method of ['select', 'eq', 'in', 'update', 'delete'] as const) mocks.query[method].mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { role: 'captain' }, error: null });
  mocks.client.rpc.mockResolvedValue({ data: id, error: null });
});

describe('template validation', () => {
  it.each(['', '   ', 'x'.repeat(81)])('rejects invalid title %s before accessing the client', async title => {
    expect(await saveAsTemplate({ kind: 'program', id, title })).toHaveProperty('error');
    expect(await renameTemplate({ kind: 'nutrition', id, title })).toHaveProperty('error');
    expect(mocks.client.auth.getUser).not.toHaveBeenCalled();
  });
  it('rejects invalid kinds, ids and injected captain ids', async () => {
    for (const value of [{ kind: 'other', id }, { kind: 'program', id: 'bad' }, { kind: 'program', id, captain_id: id }]) {
      expect(await deleteTemplate(value)).toHaveProperty('error');
      expect(await renameTemplate({ ...value, title: 'قالب' })).toHaveProperty('error');
      expect(await saveAsTemplate({ ...value, title: 'قالب' })).toHaveProperty('error');
    }
    expect(await assignTemplate({ kind: 'nutrition', templateId: id, playerId: 'bad' })).toHaveProperty('error');
    expect(await assignTemplate({ kind: 'other', templateId: id, playerId })).toHaveProperty('error');
    expect(mocks.client.auth.getUser).not.toHaveBeenCalled();
  });
});

describe('template actions', () => {
  it.each(['program', 'nutrition'] as const)('saves and assigns %s via the correct RPC', async kind => {
    expect(await saveAsTemplate({ kind, id, title: '  قالب  ' })).toEqual({ data: id });
    expect(mocks.client.rpc).toHaveBeenLastCalledWith(kind === 'program' ? 'program_to_template' : 'nutrition_plan_to_template',
      kind === 'program' ? { p_program: id, p_title: 'قالب' } : { p_plan: id, p_title: 'قالب' });
    expect(await assignTemplate({ kind, templateId: id, playerId })).toEqual({ data: id });
    expect(mocks.client.rpc).toHaveBeenLastCalledWith(kind === 'program' ? 'assign_program_template' : 'assign_nutrition_template',
      { p_template: id, p_player: playerId });
  });
  it.each(['program', 'nutrition'] as const)('renames and deletes only session-owned %s templates', async kind => {
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'captain' }, error: null })
      .mockResolvedValueOnce({ data: { id }, error: null });
    expect(await renameTemplate({ kind, id, title: '  جديد  ' })).toEqual({ data: true });
    expect(mocks.query.update).toHaveBeenCalledWith({ title: 'جديد' });
    expect(mocks.query.eq).toHaveBeenCalledWith('is_template', true);
    expect(mocks.query.eq).toHaveBeenCalledWith('captain_id', 'captain');
    expect(mocks.query.eq).toHaveBeenCalledWith('id', id);
    expect(mocks.client.from).toHaveBeenCalledWith(kind === 'program' ? 'programs' : 'nutrition_plans');
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'captain' }, error: null })
      .mockResolvedValueOnce({ data: { id }, error: null });
    expect(await deleteTemplate({ kind, id })).toEqual({ data: true });
    expect(mocks.query.delete).toHaveBeenCalled();
    expect(mocks.revalidate).toHaveBeenCalledWith('/captain/templates');
  });
  it.each([
    ['P0002', 'القالب أو المصدر مش موجود'], ['PGRST116', 'القالب أو المصدر مش موجود'],
    ['42501', 'مش مسموح لك تعمل كده'], ['22023', 'اسم القالب لازم يكون من 1 لـ80 حرف'],
    ['500', 'الطلب متنفذش. جرّب تاني'],
  ])('maps %s errors to Arabic', async (code, error) => {
    mocks.client.rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await saveAsTemplate({ kind: 'program', id, title: 'قالب' })).toEqual({ error });
    expect(await assignTemplate({ kind: 'nutrition', templateId: id, playerId })).toEqual({ error });
  });
  it('rejects signed-out and non-captain sessions', async () => {
    mocks.client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await listTemplates()).toEqual({ error: 'سجّل دخولك الأول' });
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'player' }, error: null });
    expect(await deleteTemplate({ kind: 'program', id })).toEqual({ error: 'القوالب للكباتن بس' });
    expect(mocks.query.delete).not.toHaveBeenCalled();
  });
  it('handles network failures without leaking server errors', async () => {
    mocks.client.auth.getUser.mockRejectedValue(new Error('secret'));
    expect(await listTemplates()).toEqual({ error: 'الطلب متنفذش. جرّب تاني' });
    expect(await renameTemplate({ kind: 'program', id, title: 'قالب' })).toHaveProperty('error');
    expect(await deleteTemplate({ kind: 'program', id })).toHaveProperty('error');
    expect(await saveAsTemplate({ kind: 'program', id, title: 'قالب' })).toHaveProperty('error');
    expect(await assignTemplate({ kind: 'program', templateId: id, playerId })).toHaveProperty('error');
  });
  it('returns both kinds, dates and hierarchy counts', async () => {
    const created_at = '2026-11-03T00:00:00Z';
    mocks.query.order.mockResolvedValueOnce({ data: [{ id, title: 'تمرين', created_at, program_days: [{ count: 1201 }] }], error: null })
      .mockResolvedValueOnce({ data: [{ id: playerId, title: 'أكل', created_at, meals: [{ count: 2 }] }], error: null });
    expect(await listTemplates()).toEqual({ data: [
      { id, title: 'تمرين', kind: 'program', created_at, count: 1201 },
      { id: playerId, title: 'أكل', kind: 'nutrition', created_at, count: 2 },
    ] });
    expect(mocks.query.select).toHaveBeenCalledWith('id,title,created_at,program_days(count)');
    expect(mocks.query.select).toHaveBeenCalledWith('id,title,created_at,meals(count)');
  });
  it('returns an empty library and handles failed list queries', async () => {
    mocks.query.order.mockResolvedValue({ data: [], error: null });
    expect(await listTemplates()).toEqual({ data: [] });
    mocks.query.order.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    expect(await listTemplates()).toHaveProperty('error');
  });
  it('reuses the roster and maps its errors', async () => {
    mocks.roster.mockResolvedValueOnce({ players: [{ playerId, fullName: 'علي' }] });
    expect(await listTemplatePlayers()).toEqual({ data: [{ playerId, fullName: 'علي' }] });
    mocks.roster.mockResolvedValueOnce({ error: 'اللاعبين متحملوش' });
    expect(await listTemplatePlayers()).toEqual({ error: 'اللاعبين متحملوش' });
  });
});
