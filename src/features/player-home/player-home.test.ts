import { describe, expect, it } from 'vitest';
import { KochivoDB, type WorkoutSessionRow } from '@/core/offline';
import { mapProgramSnapshot, type ProgramResponse } from './data/program-snapshot';
import { refreshSnapshot } from './data/refresh-snapshot';
import { pickTodayDay } from './next-day';
import { buildWeek } from './week';
import { estimateMinutes } from './components/today-card';

const exercise = {
  id: 'pe1', exercise_id: 'e1', position: 1, sets: 3, reps_min: 8, reps_max: 12,
  rest_seconds: 90, superset_group: null, rpe: null, tempo: null, notes: null,
  exercises: { name_ar: 'صدر', name_en: 'Chest', media_path: '/exercise.gif' },
};
const fixture: ProgramResponse = {
  id: 'p1', title: 'برنامج', notes: null, settings: { advanced: false },
  program_days: [
    { id: 'd2', position: 2, title: 'ظهر', program_exercises: [] },
    { id: 'd1', position: 1, title: 'صدر', program_exercises: [exercise] },
  ],
};
const snapshot = mapProgramSnapshot(fixture, [1, 3], 'player-1');
it('rejects program settings that cannot represent the advanced toggle', () => {
  expect(() => mapProgramSnapshot({ ...fixture, settings: { advanced: 'yes' } }, [], 'player-1')).toThrow();
});

const session = (day: string, date = '2026-11-02', completed = true): WorkoutSessionRow => ({
  id: `${day}-${date}`, program_day_id: day, training_date: date,
  started_at: `${date}T08:00:00Z`, completed_at: completed ? `${date}T09:00:00Z` : null,
  client_updated_at: `${date}T09:00:00Z`,
});

describe('pickTodayDay', () => {
  it('starts at position one without completed sessions', () => {
    expect(pickTodayDay(snapshot, [], '2026-11-03')?.id).toBe('d1');
    expect(pickTodayDay(snapshot, [session('d1', '2026-11-02', false)], '2026-11-03')?.id).toBe('d1');
  });
  it('rotates after the most recent completion, including previous weeks', () => {
    expect(pickTodayDay(snapshot, [session('d1', '2026-10-20')], '2026-11-03')?.id).toBe('d2');
  });
  it('wraps around', () => {
    expect(pickTodayDay(snapshot, [session('d2')], '2026-11-03')?.id).toBe('d1');
  });
  it('keeps the day already logged today even when complete', () => {
    expect(pickTodayDay(snapshot, [session('d2', '2026-11-03')], '2026-11-03')?.id).toBe('d2');
    expect(pickTodayDay(snapshot, [session('d2', '2026-11-03', false)], '2026-11-03')?.id).toBe('d2');
  });
  it('handles empty programs and sessions belonging to an old program', () => {
    expect(pickTodayDay({ ...snapshot, days: [] }, [], '2026-11-03')).toBeUndefined();
    expect(pickTodayDay(snapshot, [session('old')], '2026-11-03')?.id).toBe('d1');
  });
});

describe('buildWeek', () => {
  it('starts Saturday across a month boundary', () => {
    const week = buildWeek('2026-11-03', [1, 3], []);
    expect(week.map((day) => day.date)).toEqual([
      '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
    ]);
    expect(week[0]).toMatchObject({ label: 'سبت', dayOfMonth: 31 });
  });
  it('prioritizes done over today, then today over rest', () => {
    expect(buildWeek('2026-11-03', [1], [session('d1', '2026-11-03')])[3]?.state).toBe('done');
    expect(buildWeek('2026-11-03', [1], [])[3]?.state).toBe('today');
  });
  it('distinguishes training and rest using Sunday = 0', () => {
    const week = buildWeek('2026-11-03', [1], []);
    expect(week[1]?.state).toBe('rest');
    expect(week[2]?.state).toBe('train');
  });
  it('treats missing training days as training every day', () => {
    expect(buildWeek('2026-11-03', [], []).filter((day) => day.state === 'train')).toHaveLength(6);
  });
});

it('estimates minutes rounded to the nearest five', () => {
  expect(estimateMinutes(snapshot.days[0]?.exercises ?? [])).toBe(5);
  expect(estimateMinutes([])).toBe(0);
  expect(estimateMinutes([{ ...exercise, sets: 5, rest_seconds: 90 }])).toBe(10);
});

it('maps the joined response into an ordered plain snapshot', () => {
  expect(snapshot).toMatchObject({ id: 'active', player_id: 'player-1', program_id: 'p1', training_days: [1, 3] });
  expect(snapshot.days.map((day) => day.id)).toEqual(['d1', 'd2']);
  expect(snapshot.days[0]?.exercises[0]).toMatchObject({ name_ar: 'صدر', name_en: 'Chest', media_path: '/exercise.gif', sets: 3 });
  expect(fixture.program_days[0]?.id).toBe('d2');
});

it('keeps the previous Dexie snapshot on failed refresh or offline', async () => {
  const db = new KochivoDB('player-home-refresh-test');
  try {
    await db.program_snapshot.put(snapshot);
    expect(await refreshSnapshot({ db, online: true, fetch: async () => { throw new Error('network'); } })).toBe('error');
    expect(await db.program_snapshot.get('active')).toEqual(snapshot);
    expect(await refreshSnapshot({ db, online: false, fetch: async () => { throw new Error('must not fetch'); } })).toBe('offline');
    expect(await db.program_snapshot.get('active')).toEqual(snapshot);
  } finally { await db.delete(); }
});

it('replaces a snapshot after a successful refresh and clears it when no program remains', async () => {
  const db = new KochivoDB('player-home-refresh-success');
  try {
    await db.program_snapshot.put(snapshot);
    const updated = { ...snapshot, title: 'برنامج جديد' };
    expect(await refreshSnapshot({ db, online: true, fetch: async () => updated })).toBe('ready');
    expect(await db.program_snapshot.get('active')).toEqual(updated);
    expect(await refreshSnapshot({ db, online: true, fetch: async () => null })).toBe('empty');
    expect(await db.program_snapshot.get('active')).toBeUndefined();
  } finally { await db.delete(); }
});
