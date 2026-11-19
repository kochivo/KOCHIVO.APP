import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KochivoDB } from '@/core/offline';
import * as offline from '@/core/offline';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { liveQuery } from 'dexie';
import { readLocalStreakDates } from './hooks/use-streak-sessions';
import { computeStreak, shiftDate, trainingDay } from './streak';
import { buildWeek } from './week';
import { StreakPill } from './components/streak-pill';
import { StreakRing } from './components/streak-ring';
import { StreakSheet } from './components/streak-sheet';
import { Greeting } from './components/greeting';

it('hides streak details when a live query returns an unrelated or malformed value', () => {
  const liveQueryMock = vi.spyOn(offline, 'useLiveQuery');
  try {
    for (const value of [[], 0, {}, { accountStart: '2026-11-01' },
      null, { accountStart: null, completedDates: [] },
      { accountStart: '2026-11-01', completedDates: [null] },
      { accountStart: 'invalid', completedDates: [] }]) {
      liveQueryMock.mockReturnValue(value);
      const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
        createElement(Greeting, { now: new Date('2026-11-06T08:00:00Z'), playerId: 'player' })));
      expect(html).toContain('Good morning');
      expect(html).not.toContain('id="streak-pill"');
      expect(html).not.toContain('Loading training streak');
    }
    liveQueryMock.mockReturnValue(undefined);
    const pending = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
      createElement(Greeting, { now: new Date('2026-11-06T08:00:00Z'), playerId: 'player' })));
    expect(pending).toContain('Loading training streak');
    liveQueryMock.mockReturnValue({ accountStart: '2026-11-01', completedDates: ['2026-11-05'] });
    const valid = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
      createElement(Greeting, { now: new Date('2026-11-06T08:00:00Z'), playerId: 'player' })));
    expect(valid).toContain('id="streak-pill"');
    expect(valid).toContain('Training streak: 1 day');
  } finally { liveQueryMock.mockRestore(); }
});

const base = { today: '2026-11-06', accountStart: '2026-10-31', isTrainingDay: () => true };
it('skips rest days, counts extras and deduplicates dates', () => {
  expect(computeStreak({ ...base, isTrainingDay: d => d === '2026-11-02',
    completedDates: ['2026-11-02', '2026-11-02', '2026-11-04'] }).current).toBe(2);
});
it('breaks on a missed training day but leaves today pending', () => {
  expect(computeStreak({ ...base, completedDates: ['2026-11-04', '2026-11-05'] }).current).toBe(2);
  expect(computeStreak({ ...base, completedDates: ['2026-11-04', '2026-11-06'] }).current).toBe(1);
});
it('stops at account start and keeps best at least current across a month boundary', () => {
  const result = computeStreak({ ...base, accountStart: '2026-11-02',
    completedDates: ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05'] });
  expect(result).toEqual({ current: 2, best: 2, weekDone: 3, weekPlanned: 5, monthDone: 3 });
  const boundary = computeStreak({ ...base, completedDates: ['2026-10-31', '2026-11-01', '2026-11-02'] });
  expect(boundary.monthDone).toBe(2);
  expect(boundary.best).toBe(3);
  expect(boundary.best).toBeGreaterThanOrEqual(boundary.current);
});
it('shares weekly and intake scheduling with buildWeek', () => {
  const snapshot: ProgramSnapshot = { id: 'active', player_id: 'p', program_id: 'x', title: '', notes: null,
    settings: { repeatWeekly: true }, training_days: [1], days: [
      { id: 'sat', position: 0, title: '', weekday: 0, is_rest_day: false, exercises: [] },
      { id: 'mon', position: 1, title: '', weekday: 2, is_rest_day: true, exercises: [] },
    ] };
  for (const program of [snapshot, undefined]) {
    for (const entry of buildWeek(base.today, [1], [], 'en', program)) {
      if (entry.date !== base.today) expect(trainingDay(entry.date, [1], program)).toBe(entry.state === 'train');
    }
  }
  expect(trainingDay('2026-11-01', [])).toBe(true);
  expect(trainingDay('2026-11-02', [1], snapshot)).toBe(false);
});

const stats = { current: 14, best: 21, weekDone: 4, weekPlanned: 5, monthDone: 17 };
it('renders translated pill labels and the zero state', () => {
  for (const locale of ['ar', 'en'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
      createElement(StreakPill, { stats, onOpen: () => {} })));
    expect(html).toContain(locale === 'ar' ? 'سلسلة التمرين: 14 يوم، 4 من 5 الأسبوع ده' : 'Training streak: 14 days, 4 of 5 this week');
    const zero = renderToStaticMarkup(createElement(LocaleProvider, { locale },
      createElement(StreakPill, { stats: { ...stats, current: 0 }, onOpen: () => {} })));
    expect(zero).toContain(locale === 'ar' ? 'ابدأ النهارده' : 'Start today');
  }
});
it('renders a four-fifths ring and sheet details', () => {
  const ring = renderToStaticMarkup(createElement(StreakRing, { done: 4, planned: 5, size: 48 }));
  expect(ring).toContain('stroke-dashoffset="20');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(StreakSheet, { stats, today: base.today, completedDates: [], isTrainingDay: () => true, onClose: () => {} })));
  for (const text of ['الأسبوع ده', 'أحسن رقم', 'الشهر ده', '21', '17', 'أيام الراحة اللي في برنامجك مش بتكسر الرقم. بيتكسر بس لو فوّت يوم تمرين.']) expect(html).toContain(text);
});

it('counts a 130-day run and retains the best after the streak breaks', () => {
  const completedDates = Array.from({ length: 130 }, (_, i) => shiftDate(base.today, -i));
  const options = { ...base, accountStart: shiftDate(base.today, -129), completedDates };
  expect(computeStreak(options)).toMatchObject({ current: 130, best: 130 });
  expect(computeStreak({ ...options, today: shiftDate(base.today, 2) })).toMatchObject({ current: 0, best: 130 });
});

it('observes new offline completions and includes sessions older than 120 days', async () => {
  const db = new KochivoDB('streak-live-test');
  const row: WorkoutSessionRow = { id: 'session', program_day_id: 'day', training_date: base.today,
    started_at: '2026-11-06T08:00:00Z', completed_at: null, client_updated_at: '2026-11-06T08:00:00Z' };
  try {
    await db.workout_sessions.bulkPut([row, { ...row, id: 'old', training_date: '2026-07-09', completed_at: '2026-07-09T09:00:00Z' }]);
    let notify: (dates: string[]) => void = () => {};
    const first = new Promise<string[]>(resolve => { notify = resolve; });
    const subscription = liveQuery(() => readLocalStreakDates(db, base.today)).subscribe(dates => notify(dates));
    try {
      expect(await first).toEqual(['2026-07-09']);
      const next = new Promise<string[]>(resolve => { notify = resolve; });
      await db.workout_sessions.put({ ...row, completed_at: '2026-11-06T09:00:00Z' });
      expect(await next).toEqual(['2026-07-09', base.today]);
    } finally { subscription.unsubscribe(); }
  } finally { await db.delete(); }
});
