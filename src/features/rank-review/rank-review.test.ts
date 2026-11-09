import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { currentMonth, previousMonth, nextMonth, canGoNext, monthLabel } from './months';
import { CrownCard } from './components/crown-card';
import { BoardList } from './components/board-list';
import { PendingList } from './components/pending-list';
import { TeamCrownLink } from './components/team-crown-link';
import { MonthSwitch } from './components/month-switch';
import { LeaderboardScreen } from './components/leaderboard-screen';
import type { LeaderboardRow } from '@/features/ranks';
import type { PendingWorkout } from './types';
import { combinePending } from './data/load-pending';
import { decidePending } from './hooks/use-pending-points';

const holder: LeaderboardRow = { player_id: 'player-1', display_name: 'Mona', lifetime: 120,
  monthly: 84, adherence: 75, done: 6, planned: 8, tier: 'champion', is_crown: true, position: 1 };
const workout: PendingWorkout = { id: 'points-1', player_id: 'player-1', player_name: 'Mona',
  training_date: '2026-11-08', started_at: '2026-11-08T10:00:00Z', completed_at: '2026-11-08T10:12:00Z' };
const noop = () => {};

describe('month navigation', () => {
  it('crosses year boundaries and uses Cairo for the current month', () => {
    expect(previousMonth('2026-01-01')).toBe('2025-12-01');
    expect(nextMonth('2025-12-01')).toBe('2026-01-01');
    expect(currentMonth(new Date('2026-10-31T23:00:00Z'))).toBe('2026-11-01');
  });
  it('stops at the current month and labels months in both locales', () => {
    const now = new Date('2026-11-09T12:00:00Z');
    expect(canGoNext('2026-11-01', now)).toBe(false);
    expect(canGoNext('2026-10-01', now)).toBe(true);
    expect(monthLabel('2026-01-01', 'en')).toBe('January 2026');
    expect(monthLabel('2026-01-01', 'ar')).toContain('يناير');
  });
});

describe('pending workout data and decisions', () => {
  const player = '00000000-0000-4000-8000-000000000001';
  const session = '00000000-0000-4000-8000-000000000002';
  const point = '00000000-0000-4000-8000-000000000003';
  const points = [{ id: point, player_id: player, source_key: session }];
  const profiles = [{ id: player, full_name: 'Mona' }];
  const sessions = [{ id: session, player_id: player, training_date: '2026-11-08',
    started_at: workout.started_at, completed_at: workout.completed_at }];
  it('resolves session source keys without treating them as foreign keys', () => {
    expect(combinePending(points, profiles, sessions)).toEqual([{ ...workout, id: point, player_id: player }]);
    expect(() => combinePending(points, profiles, [{ ...sessions[0], player_id: session }])).toThrow('unavailable');
    expect(() => combinePending([{ ...points[0], source_key: 'invalid' }], profiles, sessions)).toThrow();
  });
  it('keeps orphan rows and preserves available session details without a profile', () => {
    expect(combinePending(points, profiles, [])).toEqual([{ id: point, player_id: player, player_name: 'Mona',
      training_date: null, started_at: null, completed_at: null }]);
    expect(combinePending(points, [], sessions)).toEqual([{ ...workout, id: point, player_id: player, player_name: null }]);
    expect(combinePending(points, [], [])).toEqual([{ id: point, player_id: player, player_name: null,
      training_date: null, started_at: null, completed_at: null }]);
    expect(() => combinePending(points, [], [{ ...sessions[0], player_id: session }])).toThrow('unavailable');
  });
  it('removes immediately, then refreshes the board only after the review succeeds', async () => {
    let finish: () => void = noop;
    const response = new Promise<void>(resolve => { finish = resolve; });
    let visible = [workout]; let refreshed = false;
    const decision = decidePending(workout.id, true, {
      remove: () => { visible = []; }, restore: () => { visible = [workout]; },
      saved: () => { refreshed = true; },
      review: async (id, approve) => {
        expect(id).toBe('points-1'); expect(approve).toBe(true); await response;
      },
    });
    expect(visible).toEqual([]); expect(refreshed).toBe(false);
    finish(); await decision; expect(refreshed).toBe(true);
  });
  it('restores failed decisions and leaves the board unchanged', async () => {
    let visible = [workout]; let error = false; let refreshed = false;
    await decidePending(workout.id, false, {
      remove: () => { visible = []; }, restore: () => { visible = [workout]; error = true; },
      saved: () => { refreshed = true; }, review: async () => { throw new Error('offline'); },
    });
    expect(visible).toEqual([workout]); expect(error).toBe(true); expect(refreshed).toBe(false);
  });
});

describe('captain ranking views', () => {
  it.each(['ar', 'en'] as const)('shows holder adherence or explains the workout minimum in %s', locale => {
    const filled = renderToStaticMarkup(createElement(CrownCard, { holder, locale }));
    expect(filled).toContain('Mona');
    expect(filled).toContain(locale === 'ar' ? 'التزام 75٪ · 6 من 8 تمرين' : '75% adherence · 6 of 8 workouts');
    const empty = renderToStaticMarkup(createElement(CrownCard, { locale }));
    expect(empty).toContain(locale === 'ar' ? 'لسه محدش أخد التاج الشهر ده' : 'Nobody holds the crown yet this month');
    expect(empty).toContain(locale === 'ar' ? 'بحد أدنى 4 تمارين' : 'at least 4 workouts this month');
    expect(empty).toContain(locale === 'ar' ? 'الأرقام الجديدة والـInBody' : 'Records and InBody scans');
    expect((filled + empty).replace(/<[^>]*>/g, '')).not.toContain('20');
  });
  it.each(['ar', 'en'] as const)('links rows and shows adherence, workouts and lifetime in %s', locale => {
    const html = renderToStaticMarkup(createElement(BoardList, { rows: [{ ...holder,
      display_name: 'Mona '.repeat(30) }], locale }));
    expect(html).toContain('href="/captain/players/player-1"');
    expect(html).toContain(locale === 'ar' ? '120 نقطة إجمالي' : '120 lifetime points');
    expect(html).toContain(locale === 'ar' ? '75٪' : '75%');
    expect(html).toContain(locale === 'ar' ? '6 من 8' : '6 of 8');
    expect(html).not.toContain(locale === 'ar' ? '84 نقطة' : '84 monthly points');
    expect(html).toContain('min-h-12'); expect(html).toContain('break-words');
    expect(html).toContain('shrink-0');
    expect(renderToStaticMarkup(createElement(BoardList, { rows: [], locale: 'ar' }))).toContain('لسه مفيش لاعيبة');
  });
  it('hides an empty pending list and translates both decisions', () => {
    expect(renderToStaticMarkup(createElement(PendingList, { rows: [], locale: 'en', onDecision: noop }))).toBe('');
    for (const locale of ['ar', 'en'] as const) {
      const html = renderToStaticMarkup(createElement(PendingList, { rows: [workout], locale, onDecision: noop }));
      expect(html).toContain(locale === 'ar' ? 'احسبها' : 'Count it');
      expect(html).toContain(locale === 'ar' ? 'ارفض' : 'Reject');
      expect(html).toContain('12');
      expect(html).not.toMatch(/class="[^"]*\b(?:ml|mr|pl|pr|left|right)-/);
    }
  });
  it('keeps the entry visible while loading or failed and only adds a positive count', () => {
    const counted = renderToStaticMarkup(createElement(TeamCrownLink, { locale: 'en', pendingCount: 3 }));
    expect(counted).toContain('href="/captain/leaderboard"'); expect(counted).toContain('3 to review');
    const empty = renderToStaticMarkup(createElement(TeamCrownLink, { locale: 'en', pendingCount: 0 }));
    expect(empty).not.toContain('to review');
    for (const pendingCount of [undefined, null]) {
      const html = renderToStaticMarkup(createElement(TeamCrownLink, { locale: 'en', pendingCount }));
      expect(html).toContain('href="/captain/leaderboard"'); expect(html).toContain('Team ranking');
      expect(html).not.toContain('to review'); expect(html).not.toContain('aria-busy');
    }
  });
  it('keeps orphan workouts reviewable with a translated name and unavailable duration', () => {
    for (const locale of ['ar', 'en'] as const) {
      const rows = [{ ...workout, player_name: null, training_date: null, started_at: null, completed_at: null }];
      const html = renderToStaticMarkup(createElement(PendingList, { rows, locale, onDecision: noop }));
      expect(html).toContain(locale === 'ar' ? 'لاعب' : 'Player');
      expect(html).toContain(locale === 'ar' ? 'مدة التمرين مش متاحة' : 'Workout duration unavailable');
      expect(html).not.toContain('<time'); expect(html).not.toMatch(/<button[^>]*\sdisabled(?:=|\s|>)/);
      expect(html).toContain(locale === 'ar' ? 'احسبها' : 'Count it');
      expect(html).toContain(locale === 'ar' ? 'ارفض' : 'Reject');
    }
  });
  it('disables next on the current month with translated accessible controls', () => {
    const html = renderToStaticMarkup(createElement(MonthSwitch, { month: '2026-11-01', locale: 'en',
      now: new Date('2026-11-09T12:00:00Z'), onChange: noop }));
    expect(html).toContain('aria-label="Next month"'); expect(html).toContain('disabled');
  });
  it('renders loading, retry, rollback errors and RTL-safe populated screens', () => {
    const board = { month: '2026-11-01', now: new Date('2026-11-09T12:00:00Z'),
      error: false, setMonth: noop, reload: noop };
    const pending = { error: false, decisionError: false, busy: false, reload: noop, decide: noop };
    const loading = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en', board, pending }));
    expect(loading).toContain('aria-busy="true"');
    const failed = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en',
      board: { ...board, error: true }, pending: { ...pending, error: true } }));
    expect(failed).toContain('Could not load the ranking');
    expect(failed).toContain('Could not load workouts'); expect(failed).toContain('Try again');
    for (const locale of ['ar', 'en'] as const) {
      const html = renderToStaticMarkup(createElement(LeaderboardScreen, { locale,
        board: { ...board, rows: [holder] }, pending: { ...pending, rows: [workout], decisionError: true } }));
      expect(html).toContain(locale === 'ar' ? 'القرار متسجلش' : 'Decision failed');
      expect(html).not.toMatch(/class="[^"]*\b(?:ml|mr|pl|pr|left|right)-/);
      const entry = renderToStaticMarkup(createElement(TeamCrownLink, { locale, pendingCount: 2 }));
      expect(entry).toContain(locale === 'ar' ? 'ترتيب الفريق' : 'Team ranking');
      expect(entry).not.toMatch(/class="[^"]*\b(?:ml|mr|pl|pr|left|right)-/);
    }
  });
});
