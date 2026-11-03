import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deletionDate, inviteMessageSchema, profileSchema } from './schema';
import { buildExport, exportFileName } from './export';
import { exportMyData, saveInviteMessage } from './data/settings';
import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mock = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth: { getUser: mock.getUser }, from: mock.from }) }));

beforeEach(() => vi.clearAllMocks());
describe('settings', () => {
  it('validates names and the database E.164 phone rule', () => {
    expect(profileSchema.safeParse({ full_name: 'علي', phone: '+201012345678' }).success).toBe(true);
    for (const input of [{ full_name: '', phone: '+201012345678' }, { full_name: 'a'.repeat(81), phone: '+201012345678' },
      { full_name: 'علي', phone: '201012345678' }, { full_name: 'علي', phone: '+1234567890123456' }]) {
      expect(profileSchema.safeParse(input).success).toBe(false);
    }
  });
  it('limits invite messages to 500 characters', () => {
    expect(inviteMessageSchema.safeParse({ invite_message: 'a'.repeat(500) }).success).toBe(true);
    expect(inviteMessageSchema.safeParse({ invite_message: 'a'.repeat(501) }).success).toBe(false);
  });
  it('adds seven days across a month boundary', () => {
    expect(deletionDate('2026-10-29T12:00:00Z')).toBe('2026-11-05T12:00:00.000Z');
  });
  it('builds an export and Cairo date filename with an injected time', () => {
    const now = new Date('2026-11-03T23:00:00Z');
    expect(buildExport({ profile: { id: 'self' }, rows: { meal_logs: [] } }, now)).toEqual({
      exported_at: now.toISOString(), profile: { id: 'self' }, meal_logs: [],
    });
    expect(exportFileName(now)).toBe('kochivo-data-2026-11-04.json');
  });
  it('refuses to save a player invite message before updating', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'player' } }, error: null });
    const single = vi.fn().mockResolvedValue({ data: { id: 'player', role: 'player' }, error: null });
    mock.from.mockReturnValue({ select: () => ({ eq: () => ({ single }) }) });
    expect(await saveInviteMessage({ invite_message: 'hello' })).toEqual({ error: 'رسالة الدعوة للكابتن بس' });
    expect(mock.from).toHaveBeenCalledTimes(1);
  });
  it.each(['player', 'captain'])('exports only caller-owned rows for a %s', async (role) => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
    const filters: unknown[][] = [];
    const ranges: unknown[][] = [];
    mock.from.mockImplementation((table: string) => ({ select: () => ({ eq: (column: string, id: string) => {
      filters.push([table, column, id]);
      return table === 'profiles' ? { single: async () => ({ data: { id, role }, error: null }) } : {
        order: () => ({ range: async (start: number, end: number) => {
          ranges.push([table, start, end]);
          return { data: start === 0 && table === 'workout_sessions' ? Array.from({ length: 500 }, (_, i) => ({ id: String(i) })) : [], error: null };
        } }),
      };
    } }) }));
    const result = await exportMyData();
    expect(result.error).toBeUndefined();
    const tables = role === 'captain' ? ['coach_clients', 'programs', 'nutrition_plans'] :
      ['workout_sessions', 'set_logs', 'meal_logs', 'check_ins', 'form_checks', 'player_intake'];
    expect(Object.keys(result.data?.rows ?? {})).toEqual(tables);
    for (const table of tables) expect(filters).toContainEqual([table, role === 'captain' ? 'captain_id' : 'player_id', 'self']);
    if (role === 'player') {
      expect(ranges).toContainEqual(['workout_sessions', 500, 999]);
      expect(result.data?.rows.workout_sessions).toHaveLength(500);
    }
  });
  it('does not return a partial export on a query failure', async () => {
    mock.getUser.mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
    mock.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => table === 'profiles' ?
      { single: async () => ({ data: { id: 'self', role: 'player' }, error: null }) } :
      { order: () => ({ range: async () => ({ data: null, error: { message: 'failure' } }) }) },
    }) }));
    expect(await exportMyData()).toEqual({ error: 'مش قادرين ننزّل بياناتك. جرّب تاني' });
  });
});

it.each([false, true])('renders a switch and flips glass mode with blocked storage=%s', async (blocked) => {
  const dataset = { glass: 'blur' };
  const setItem = vi.fn(() => { if (blocked) throw new Error('blocked'); });
  vi.stubGlobal('document', { documentElement: { dataset } });
  vi.stubGlobal('localStorage', { setItem });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  // The node test environment has no DOM renderer; read the real snapshot on each render.
  vi.doMock('react', async (original) => ({
    ...await original<typeof React>(),
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean) => snapshot(),
  }));
  try {
    const { GlassToggle } = await import('./components/glass-toggle');
    const render = () => renderToStaticMarkup(createElement(GlassToggle));
    expect(render()).toContain('role="switch"');
    expect(render()).toContain('aria-checked="false"');
    expect(render()).toContain('min-h-12');
    expect(render()).toContain('شكل أخف للموبايلات الضعيفة');
    GlassToggle().props.onClick();
    expect(dataset.glass).toBe('solid');
    expect(setItem).toHaveBeenLastCalledWith('kochivo.glass', 'solid');
    expect(render()).toContain('aria-checked="true"');
    GlassToggle().props.onClick();
    expect(dataset.glass).toBe('blur');
    expect(setItem).toHaveBeenLastCalledWith('kochivo.glass', 'blur');
    expect(render()).toContain('aria-checked="false"');
  } finally {
    vi.doUnmock('react');
    vi.unstubAllGlobals();
  }
});
