import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { age, checkinSnapshot, intakeSnapshot, fitFacts, formHistory, loadPlayerFile, mergePlayerFile } from './index';
import type { CheckinRow, IntakeRow, Snapshot } from './model';

const now = new Date('2026-11-11T12:00:00Z');
const intake: IntakeRow = {
  player_id: 'player', birth_year: 1995, sex: 'male', height_cm: 175, weight_kg: 80,
  target_weight_kg: 75, experience: 'beginner', training_days: [6, 0, 2], session_minutes: 60,
  injuries: ['knee'], medical: ['none'], allergies: [], notes: 'intake note',
  created_at: '2026-10-01T12:00:00Z', completed_at: '2026-10-02T12:00:00Z',
  updated_at: '2026-10-03T12:00:00Z',
};
const initial = () => intakeSnapshot(intake, '2026-11-11');
const checkin = (weight = 78): Snapshot => checkinSnapshot({
  id: 'checkin', created_at: '2026-11-10T12:00:00Z', body_weight_kg: weight, waist_cm: 85, notes: null,
});

describe('player file', () => {
  it('maps every intake fact and exposes planning facts in Saturday order', () => {
    const facts = mergePlayerFile([initial()], now);
    expect(Object.keys(facts)).toHaveLength(12);
    expect(facts.weight).toMatchObject({ value: 80, source: { kind: 'intake', id: 'player', at: intake.updated_at } });
    expect(facts.age?.value).toBe(31);
    expect(age(1995, '2027-01-01')).toBe(32);
    expect(fitFacts(facts)).toEqual({ trainingDays: [0, 1, 3], sessionMinutes: 60, injuries: ['knee'] });
    expect(initial().facts).toMatchObject({ targetWeight: 75, height: 175, sex: 'male', experience: 'beginner',
      medical: ['none'], allergies: [], note: 'intake note' });
  });

  it('uses intake timestamp fallbacks', () => {
    expect(intakeSnapshot({ ...intake, updated_at: null }, '2026-11-11').source.at).toBe(intake.completed_at);
    expect(intakeSnapshot({ ...intake, updated_at: null, completed_at: null }, '2026-11-11').source.at).toBe(intake.created_at);
  });

  it('keeps the newest older different weight, even across repeated answers', () => {
    const repeat = { ...checkin(), source: { ...checkin().source, id: 'repeat', at: '2026-11-11T10:00:00Z' } };
    const facts = mergePlayerFile([repeat, initial(), checkin()], now);
    expect(facts.weight).toMatchObject({ value: 78, previous: { value: 80, source: initial().source } });
    expect(facts.waist?.value).toBe(85);
    expect(facts.note?.value).toBe('intake note');
  });

  it('has no previous for unchanged weight', () => {
    expect(mergePlayerFile([initial(), checkin(80)], now).weight?.previous).toBeUndefined();
  });

  it('ignores explicitly undefined answers in merging and history', () => {
    const snapshots: Snapshot[] = [
      { source: initial().source, facts: { weight: 80 } },
      { source: checkin().source, facts: { weight: undefined } },
      { source: { kind: 'future-form', id: 'future', at: '2026-11-11T10:00:00Z' }, facts: { weight: 80 } },
    ];
    expect(formHistory(snapshots).map(form => form.changed)).toEqual([[], [], []]);
    expect(mergePlayerFile(snapshots, now).weight?.previous).toBeUndefined();
  });

  it('compares arrays as sets and tracks updated intake injuries', () => {
    const updated = intakeSnapshot({ ...intake, updated_at: '2026-11-11T10:00:00Z', injuries: ['knee', 'back'] }, '2026-11-11');
    const reordered = { ...updated, source: { ...updated.source, at: '2026-11-11T11:00:00Z' },
      facts: { ...updated.facts, injuries: ['back', 'knee', 'knee'] } };
    expect(mergePlayerFile([initial(), updated, reordered], now).injuries?.previous?.value).toEqual(['knee']);
    expect(formHistory([reordered, initial(), updated]).map(row => row.changed)).toEqual([[], ['injuries'], []]);
  });

  it('lists each form changes against the preceding combined state', () => {
    expect(formHistory([checkin(), initial()])).toEqual([
      { source: checkin().source, changed: ['weight', 'waist'], first: false },
      { source: initial().source, changed: [], first: true },
    ]);
    expect(formHistory([])).toEqual([]);
    expect(mergePlayerFile([], now)).toEqual({});
  });

  it('flags only facts from the newest form since the last view', () => {
    expect(mergePlayerFile([initial(), checkin()], now).weight?.isNew).toBe(true);
    expect(mergePlayerFile([initial(), checkin()], now).height?.isNew).toBe(false);
    expect(mergePlayerFile([initial(), checkin()], now, checkin().source.at).weight?.isNew).toBe(false);
    expect(mergePlayerFile([initial(), checkin()], now, intake.updated_at ?? undefined).weight?.isNew).toBe(true);
  });

  it('handles null optional intake values as explicit cleared answers', () => {
    const cleared = intakeSnapshot({ ...intake, target_weight_kg: null, notes: null, updated_at: checkin().source.at }, '2026-11-11');
    expect(mergePlayerFile([initial(), cleared], now).targetWeight).toMatchObject({ value: null, previous: { value: 75 } });
    expect(mergePlayerFile([initial(), cleared], now).note?.value).toBeNull();
  });
});

function fakeClient(rows: {
  intake?: IntakeRow[]; checkins?: CheckinRow[]; error?: { message: string }; wait?: Promise<void>;
} = {}) {
  const calls: { table: string; select?: string; filter?: unknown[]; order: unknown[][]; limit?: number }[] = [];
  const client = { from(table: string) {
    const call: (typeof calls)[number] = { table, order: [] };
    calls.push(call);
    const query = {
      select(columns: string) { call.select = columns; return query; },
      eq(...filter: unknown[]) { call.filter = filter; return query; },
      order(...order: unknown[]) { call.order.push(order); return query; },
      limit(limit: number) { call.limit = limit; return (rows.wait ?? Promise.resolve()).then(() => ({
        data: table === 'player_intake' ? rows.intake ?? [intake] : rows.checkins ?? [], error: rows.error ?? null,
      })); },
    };
    return query;
  } } as unknown as SupabaseClient<AppDatabase>;
  return { client, calls };
}

describe('loadPlayerFile', () => {
  it('starts both queries before either resolves and merges check-in answers', async () => {
    let release = () => {};
    const wait = new Promise<void>(resolve => { release = resolve; });
    const { client, calls } = fakeClient({ wait, checkins: [{
      id: 'checkin', created_at: checkin().source.at, body_weight_kg: 78, waist_cm: 85, notes: 'updated',
    }] });
    const pending = loadPlayerFile(client, 'player', { now });
    expect(calls).toHaveLength(2);
    release();
    const result = await pending;
    expect(result.facts.weight).toMatchObject({ value: 78, previous: { value: 80 } });
    expect(result.facts.note?.value).toBe('updated');
  });

  it('selects only adapter columns in two bounded player queries', async () => {
    const { client, calls } = fakeClient();
    const result = await loadPlayerFile(client, 'player', { now, checkinLimit: 3 });
    expect(result.facts.weight?.value).toBe(80);
    expect(result.history).toHaveLength(1);
    expect(calls.map(call => [call.table, call.filter, call.limit])).toEqual([
      ['player_intake', ['player_id', 'player'], 1], ['check_ins', ['player_id', 'player'], 3],
    ]);
    expect(calls[0]?.select?.split(',').sort()).toEqual(Object.keys(intake).sort());
    expect(calls[1]?.select).toBe('id,created_at,body_weight_kg,waist_cm,notes');
    expect(calls[1]?.order[0]).toEqual(['created_at', { ascending: false }]);
  });

  it('defaults to twelve check-ins and supports empty RLS results', async () => {
    const { client, calls } = fakeClient({ intake: [] });
    expect(await loadPlayerFile(client, 'player', { now })).toEqual({ facts: {}, history: [] });
    expect(calls[1]?.limit).toBe(12);
  });

  it('propagates query errors instead of returning a partial player file', async () => {
    const { client } = fakeClient({ error: { message: 'denied' } });
    await expect(loadPlayerFile(client, 'player', { now })).rejects.toEqual({ message: 'denied' });
  });

  it('rejects unbounded limits before querying', async () => {
    for (const checkinLimit of [-1, Infinity, NaN, 1.5]) {
      const { client, calls } = fakeClient();
      await expect(loadPlayerFile(client, 'player', { now, checkinLimit })).rejects.toThrow(RangeError);
      expect(calls).toEqual([]);
    }
  });
});
