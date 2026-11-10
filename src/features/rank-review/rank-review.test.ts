import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { currentMonth, previousMonth, nextMonth, canGoNext, monthLabel } from './months';
import { CrownCard } from './components/crown-card';
import { BoardList } from './components/board-list';
import { TeamCrownLink } from './components/team-crown-link';
import { MonthSwitch } from './components/month-switch';
import { LeaderboardScreen } from './components/leaderboard-screen';
import type { LeaderboardRow } from '@/features/ranks';

const holder: LeaderboardRow = { player_id: 'player-1', display_name: 'Mona', lifetime: 120,
  monthly: 84, adherence: 75, done: 6, planned: 8, tier: 'champion', is_crown: true, position: 1 };
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
  it.each(['ar', 'en'] as const)('renders a plain crown link without review counts in %s', locale => {
    const html = renderToStaticMarkup(createElement(TeamCrownLink, { locale }));
    expect(html).toContain('href="/captain/leaderboard"');
    expect(html).toContain(locale === 'ar' ? 'ترتيب الفريق' : 'Team ranking');
    expect(html).not.toContain(locale === 'ar' ? 'للمراجعة' : 'to review');
    expect(html).not.toContain('aria-busy');
    expect(html).not.toContain('<button');
    expect(html).not.toMatch(/class="[^"]*\b(?:ml|mr|pl|pr|left|right)-/);
  });
  it('disables next on the current month with translated accessible controls', () => {
    const html = renderToStaticMarkup(createElement(MonthSwitch, { month: '2026-11-01', locale: 'en',
      now: new Date('2026-11-09T12:00:00Z'), onChange: noop }));
    expect(html).toContain('aria-label="Next month"'); expect(html).toContain('disabled');
  });
  it('renders board loading and retry states', () => {
    const board = { month: '2026-11-01', now: new Date('2026-11-09T12:00:00Z'),
      error: false, setMonth: noop, reload: noop };
    const loading = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en', board }));
    expect(loading).toContain('aria-busy="true"');
    const failed = renderToStaticMarkup(createElement(LeaderboardScreen, { locale: 'en',
      board: { ...board, error: true } }));
    expect(failed).toContain('Could not load the ranking');
    expect(failed).toContain('Try again');
  });
  it.each(['ar', 'en'] as const)('shows only month controls, crown and board in %s', locale => {
    const board = { month: '2026-11-01', now: new Date('2026-11-09T12:00:00Z'),
      rows: [holder], error: false, setMonth: noop, reload: noop };
    const html = renderToStaticMarkup(createElement(LeaderboardScreen, { locale, board }));
    expect(html).toContain('Mona');
    expect(html).toContain(locale === 'ar' ? 'تاج الفريق' : 'Team crown');
    expect(html).toContain(locale === 'ar' ? 'نوفمبر' : 'November');
    expect(html.match(/<button/g)).toHaveLength(2);
    for (const label of ['Workouts to review', 'Count it', 'Reject', 'تمارين محتاجة مراجعتك', 'احسبها', 'ارفض'])
      expect(html).not.toContain(label);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toMatch(/class="[^"]*\b(?:ml|mr|pl|pr|left|right)-/);
  });
});
