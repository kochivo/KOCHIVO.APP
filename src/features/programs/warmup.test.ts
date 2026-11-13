import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadProgram, saveProgram } from './data/program-io';
import { addDay } from './draft';
import { convertToWeek } from './weekly-draft';
import { addWarmupItem, dayWarmupSchema, emptyWarmup, moveWarmupItem, rampSets,
  removeWarmupItem, setRamp, warmupMinutes } from './warmup';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
const database = vi.hoisted(() => ({ rpc: vi.fn(), days: [] as Record<string, unknown>[] }));
const programId = '019ab800-0000-7000-8000-000000000010';
const dayId = '019ab800-0000-7000-8000-000000000011';
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  rpc: database.rpc,
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } } }) },
  from: (table: string) => ({ select: () => ({ eq: () => ({
    eq: () => ({ single: async () => ({ data: { id: programId, player_id: null,
      title: 'Program', status: 'draft', settings: {} }, error: null }) }),
    order: async () => ({ data: database.days, error: null }),
  }), in: () => ({ order: async () => ({ data: [], error: null }) }) }), table }),
}) }));
beforeEach(() => { database.rpc.mockReset(); database.rpc.mockResolvedValue({ error: null }); database.days = []; });

const first = { id: '019ab800-0000-7000-8000-000000000001', name: 'Walk', amount: 5, unit: 'min' as const };
const second = { ...first, id: '019ab800-0000-7000-8000-000000000002', name: 'Mobility', amount: 61, unit: 'sec' as const };

it('defaults new days and preserves existing warm-up when converting a rotation to a week', () => {
  const draft = addDay({ id: programId, player_id: null, title: 'Program', status: 'draft', days: [] }, dayId);
  expect(draft.days[0]?.warmup).toEqual({ items: [], ramp: false });
  const source = { ...draft, days: draft.days.map(day => ({ ...day, warmup: { items: [first], ramp: true } })) };
  const weekly = convertToWeek(source, () => 'new-day');
  expect(weekly.days[0]?.warmup).toEqual({ items: [first], ramp: true });
  expect(weekly.days.slice(1).map(day => day.warmup)).toEqual(Array.from({ length: 6 }, () => ({ items: [], ramp: false })));
  expect(source.days[0]?.warmup).toEqual({ items: [first], ramp: true });
  expect(source.days[0]?.weekday).toBeUndefined();
});

describe('warm-up validation', () => {
  it('preserves optional library IDs and legacy items and rejects invalid IDs', () => {
    const linked = { ...first, exerciseId: dayId };
    expect(dayWarmupSchema.parse({ items: [first, linked], ramp: false }).items).toEqual([first, linked]);
    expect(dayWarmupSchema.safeParse({ items: [{ ...first, exerciseId: 'bad' }], ramp: false }).success).toBe(false);
  });
  it('defaults only a missing legacy value and returns independent empty values', () => {
    expect(dayWarmupSchema.parse(undefined)).toEqual({ items: [], ramp: false });
    const a = emptyWarmup();
    a.items.push(first);
    expect(emptyWarmup()).toEqual({ items: [], ramp: false });
  });
  it('accepts boundary values and all units', () => {
    for (const unit of ['min', 'sec', 'reps', 'times']) {
      expect(dayWarmupSchema.safeParse({ items: [{ ...first, name: 'x'.repeat(60), amount: 999,
        unit, note: 'x'.repeat(80) }], ramp: true }).success).toBe(true);
    }
  });
  it('rejects malformed items and invalid top-level values', () => {
    for (const patch of [{ id: 'bad' }, { name: '' }, { name: ' ' }, { name: 'x'.repeat(61) },
      { amount: 0 }, { amount: 1000 }, { amount: 1.5 }, { unit: 'kg' }, { note: 'x'.repeat(81) }]) {
      expect(dayWarmupSchema.safeParse({ items: [{ ...first, ...patch }], ramp: false }).success).toBe(false);
    }
    for (const value of [null, [], {}, { items: [], ramp: 'false' },
      { items: Array.from({ length: 13 }, () => first), ramp: false }]) {
      expect(dayWarmupSchema.safeParse(value).success).toBe(false);
    }
  });
});

it('adds, removes and moves items immutably, keeping ramp enabled', () => {
  const original = { items: [first], ramp: true };
  const added = addWarmupItem(original, second);
  expect(original.items).toEqual([first]);
  expect(added).toEqual({ items: [first, second], ramp: true });
  expect(moveWarmupItem(added, second.id, -1).items).toEqual([second, first]);
  expect(moveWarmupItem(added, first.id, 1).items).toEqual([second, first]);
  expect(moveWarmupItem(added, first.id, -1)).toEqual(added);
  expect(moveWarmupItem(added, second.id, 1)).toEqual(added);
  expect(moveWarmupItem(added, 'missing', 1)).toEqual(added);
  expect(removeWarmupItem(added, first.id)).toEqual({ items: [second], ramp: true });
  expect(removeWarmupItem(added, 'missing')).toEqual(added);
  expect(added.items).toEqual([first, second]);
});

it('rejects a thirteenth item and validates additions', () => {
  expect(() => addWarmupItem({ items: Array.from({ length: 12 }, () => first), ramp: false }, second)).toThrow();
  expect(() => addWarmupItem(emptyWarmup(), { ...first, amount: 0 })).toThrow();
});

it('sets ramp independently of items', () => {
  const value = { items: [first], ramp: false };
  expect(setRamp(value, true)).toEqual({ items: [first], ramp: true });
  expect(setRamp(setRamp(value, true), false)).toEqual(value);
  expect(value.ramp).toBe(false);
});

it('sums timed items and rounds total seconds up to minutes, ignoring reps and times', () => {
  expect(warmupMinutes(emptyWarmup())).toBe(0);
  expect(warmupMinutes({ items: [first, second, { ...second, amount: 59 },
    { ...first, unit: 'reps' }, { ...first, unit: 'times' }], ramp: true })).toBe(7);
  expect(warmupMinutes({ items: [second], ramp: false })).toBe(2);
});

it('returns the fixed ramp ladder with rounded kg or unknown weights', () => {
  expect(rampSets(77)).toEqual([
    { percent: 50, reps: 10, kg: 37.5 }, { percent: 70, reps: 5, kg: 55 }, { percent: 85, reps: 2, kg: 65 },
  ]);
  expect(rampSets(null)).toEqual([
    { percent: 50, reps: 10, kg: null }, { percent: 70, reps: 5, kg: null }, { percent: 85, reps: 2, kg: null },
  ]);
  expect(rampSets(0).map(row => row.kg)).toEqual([0, 0, 0]);
});

it('loads legacy days with a default and preserves validated warm-up data', async () => {
  const day = { id: dayId, program_id: programId, title: 'Day', position: 1 };
  database.days = [day];
  const legacy = await loadProgram(programId);
  expect(legacy.data?.days[0]?.warmup).toEqual({ items: [], ramp: false });
  database.days = [{ ...day, warmup: { items: [first], ramp: true } }];
  const loaded = await loadProgram(programId);
  expect(loaded.data?.days[0]?.warmup).toEqual({ items: [first], ramp: true });
  database.days = [{ ...day, warmup: { items: [first], ramp: 'true' } }];
  expect(await loadProgram(programId)).toHaveProperty('error');
});

it('includes validated warm-up data in the RPC payload and rejects invalid items before writing', async () => {
  const day = { id: dayId, program_id: programId, title: 'Day', position: 1, exercises: [],
    warmup: { items: [first, { ...second, exerciseId: dayId }], ramp: true } };
  const draft = { id: programId, player_id: null, title: 'Program', status: 'draft' as const, days: [day] };
  expect(await saveProgram(draft)).toEqual({ ok: true, data: true });
  expect(database.rpc).toHaveBeenCalledWith('save_weekly_program', { p_draft: {
    id: programId, player_id: null, title: 'Program', days: [{ ...day, is_rest_day: false, cardio: [] }],
  } });
  database.rpc.mockClear();
  expect(await saveProgram({ ...draft, days: [{ ...day, warmup: { items: [{ ...first, amount: 0 }], ramp: true } }] }))
    .toHaveProperty('ok', false);
  expect(database.rpc).not.toHaveBeenCalled();
});
