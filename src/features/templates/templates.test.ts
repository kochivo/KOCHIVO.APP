vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignTemplate, copyTemplate, createTemplate, deleteTemplate, listTemplatePlayers, listTemplates, renameTemplate, saveAsTemplate } from './data/templates';

const mocks = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), single: vi.fn(), update: vi.fn(), delete: vi.fn(), insert: vi.fn() };
  const client = { auth: { getClaims: vi.fn() }, from: vi.fn(), rpc: vi.fn() };
  return { query, client, roster: vi.fn(), revalidate: vi.fn() };
});
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => mocks.client }));
vi.mock('@/features/roster', () => ({ fetchRoster: mocks.roster }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
const id = '01900000-0000-7000-8000-000000000001';
const playerId = '01900000-0000-7000-8000-000000000002';
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: 'captain' } }, error: null });
  mocks.client.from.mockReturnValue(mocks.query);
  for (const method of ['select', 'eq', 'in', 'update', 'delete'] as const) mocks.query[method].mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { role: 'captain' }, error: null });
  mocks.client.rpc.mockResolvedValue({ data: id, error: null });
});

describe('template validation', () => {
  it.each(['', '   ', 'x'.repeat(81)])('rejects invalid title %s before accessing the client', async title => {
    expect(await saveAsTemplate({ kind: 'program', id, title })).toHaveProperty('error');
    expect(await renameTemplate({ kind: 'nutrition', id, title })).toHaveProperty('error');
    expect(mocks.client.auth.getClaims).not.toHaveBeenCalled();
  });
  it('rejects invalid kinds, ids and injected captain ids', async () => {
    for (const value of [{ kind: 'other', id }, { kind: 'program', id: 'bad' }, { kind: 'program', id, captain_id: id }]) {
      expect(await deleteTemplate(value)).toHaveProperty('error');
      expect(await renameTemplate({ ...value, title: 'قالب' })).toHaveProperty('error');
      expect(await saveAsTemplate({ ...value, title: 'قالب' })).toHaveProperty('error');
    }
    expect(await assignTemplate({ kind: 'nutrition', templateId: id, playerId: 'bad' })).toHaveProperty('error');
    expect(await assignTemplate({ kind: 'other', templateId: id, playerId })).toHaveProperty('error');
    expect(mocks.client.auth.getClaims).not.toHaveBeenCalled();
  });
});

describe('template actions', () => {
  it.each(['program', 'nutrition'] as const)('creates a blank %s template with no player', async kind => {
    mocks.query.insert.mockResolvedValue({ error: null });
    const result = await createTemplate({ kind });
    expect(result.data).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.client.from).toHaveBeenCalledWith(kind === 'program' ? 'programs' : 'nutrition_plans');
    expect(mocks.query.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: result.data, captain_id: 'captain', player_id: null, is_template: true, title: 'قالب جديد', status: 'draft',
    }));
  });
  it('starts a program template as a seven-day week so rest days can be set', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
    mocks.query.insert.mockResolvedValue({ error: null });
    const result = await createTemplate({ kind: 'program' });
    expect(mocks.client.from).toHaveBeenCalledWith('program_days');
    const days = mocks.query.insert.mock.calls[1]?.[0] as { weekday: number; is_rest_day: boolean; program_id: string }[];
    expect(days.map(day => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(days.every(day => day.is_rest_day && day.program_id === result.data)).toBe(true);
  });
  it('starts workspace templates with Saturday ready for training', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
    mocks.query.insert.mockResolvedValue({ error: null });
    await createTemplate({ kind: 'program' });
    const days = mocks.query.insert.mock.calls[1]?.[0] as { weekday: number; is_rest_day: boolean }[];
    expect(days.map(day => day.is_rest_day)).toEqual([false, true, true, true, true, true, true]);
    expect(days[0]?.weekday).toBe(0);
  });
  it('removes the template when its days cannot be created', async () => {
    mocks.query.insert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { code: '42501' } });
    expect(await createTemplate({ kind: 'program' })).toHaveProperty('error');
    expect(mocks.query.delete).toHaveBeenCalled();
  });
  it('reports a failed blank template creation', async () => {
    mocks.query.insert.mockResolvedValue({ error: { code: '42501' } });
    expect(await createTemplate({ kind: 'program' })).toHaveProperty('error');
  });
  it.each(['program', 'nutrition'] as const)('copies a %s template through copy_template', async kind => {
    expect(await copyTemplate({ kind, id, title: ' نسخة ' })).toEqual({ data: id });
    expect(mocks.client.rpc).toHaveBeenLastCalledWith('copy_template', { p_kind: kind, p_template: id, p_title: 'نسخة' });
  });
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
    for (const kind of ['program', 'nutrition'] as const) {
      expect(await assignTemplate({ kind, templateId: id, playerId }))
        .toEqual({ error: code === '22023' ? kind === 'program'
          ? 'القالب فاضي. ضيف تمرين أو كارديو في يوم مش راحة الأول'
          : 'القالب فاضي. زوّد أيام أو وجبات الأول' : error });
    }
  });
  it('rejects signed-out and non-captain sessions', async () => {
    mocks.client.auth.getClaims.mockResolvedValueOnce({ data: { claims: {} }, error: null });
    expect(await listTemplates()).toEqual({ error: 'سجّل دخولك الأول' });
    mocks.query.single.mockResolvedValueOnce({ data: { role: 'player' }, error: null });
    expect(await deleteTemplate({ kind: 'program', id })).toEqual({ error: 'القوالب للكباتن بس' });
    expect(mocks.query.delete).not.toHaveBeenCalled();
  });
  it('handles network failures without leaking server errors', async () => {
    mocks.client.auth.getClaims.mockRejectedValue(new Error('secret'));
    expect(await listTemplates()).toEqual({ error: 'الطلب متنفذش. جرّب تاني' });
    expect(await renameTemplate({ kind: 'program', id, title: 'قالب' })).toHaveProperty('error');
    expect(await deleteTemplate({ kind: 'program', id })).toHaveProperty('error');
    expect(await saveAsTemplate({ kind: 'program', id, title: 'قالب' })).toHaveProperty('error');
    expect(await assignTemplate({ kind: 'program', templateId: id, playerId })).toHaveProperty('error');
  });
  it('returns both kinds, dates and hierarchy counts', async () => {
    const created_at = '2026-11-03T00:00:00Z';
    mocks.query.order.mockResolvedValueOnce({ data: [{ id, title: 'تمرين', created_at, is_starter: true, program_days: [{ count: 1201 }] }], error: null })
      .mockResolvedValueOnce({ data: [{ id: playerId, title: 'أكل', created_at, is_starter: false, meals: [{ count: 2 }] }], error: null });
    expect(await listTemplates()).toEqual({ data: [
      { id, title: 'تمرين', kind: 'program', created_at, count: 1201, starter: true },
      { id: playerId, title: 'أكل', kind: 'nutrition', created_at, count: 2, starter: false },
    ] });
    expect(mocks.query.select).toHaveBeenCalledWith('id,title,created_at,is_starter,program_days(count)');
    expect(mocks.query.select).toHaveBeenCalledWith('id,title,created_at,is_starter,meals(count)');
  });
  it('starts nutrition templates while the program request is still pending', async () => {
    let release = () => {};
    const programs = new Promise<{ data: []; error: null }>(resolve => {
      release = () => resolve({ data: [], error: null });
    });
    mocks.query.order.mockReturnValueOnce(programs).mockResolvedValueOnce({ data: [], error: null });
    const loading = listTemplates();
    try {
      for (let step = 0; step < 20; step++) await Promise.resolve();
      expect(mocks.client.from).toHaveBeenCalledWith('nutrition_plans');
    } finally { release(); }
    expect(await loading).toEqual({ data: [] });
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
