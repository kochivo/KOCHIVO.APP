import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { PlayerTabsView } from './components/player-tabs-view';
import { workoutTarget } from './workout-target';
import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { PillNav } from '@/ui/pill-nav';
import { playerNav } from './nav';
import { createHash } from 'node:crypto';

vi.mock('next/link', () => ({ default: 'a', useLinkStatus: () => ({ pending: false }) }));
vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());

it('preserves the embedded guided demo coach destination and active state', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(PlayerTabsView, { pathname: '/player/captain', locale: 'ar', label: 'nav', onSelect() {} }));
  expect([...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])).toEqual([
    '#/player', '#/player/nutrition', '#/player/progress', '#/player/captain',
  ]);
  expect(html).toMatch(/href="#\/player\/captain"[^>]*aria-current="page"/);
});

it.each(['ar', 'en'] as const)('preserves the original flag-off tab markup hash in %s', locale => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const original = renderToStaticMarkup(createElement(PillNav, { 'aria-label': 'nav', items: playerNav('/player', locale) }));
  const actual = renderToStaticMarkup(createElement(PlayerTabsView, { pathname: '/player', locale, label: 'nav' }));
  const hash = (markup: string) => createHash('sha256').update(markup).digest('hex');
  const baseline = locale === 'ar' ? '4eaa61d87fa316b0d445b666579265265eefa92aac42aec0a4596fc1d31b5403'
    : '5fd4ce60e88bdbfaff90e2a686e624119e7350c5ccb3ac6cdca3dbae12dc2e22';
  expect(hash(original)).toBe(baseline);
  expect(hash(actual)).toBe(baseline);
});

it.each(['/player', '/player/nutrition', '/player/progress/history', '/player/assessments/new'])(
  'marks only the matching v4 tab active for %s', pathname => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
    expect(playerNav(pathname).filter(item => item.active).map(item => item.href)).toEqual([
      pathname.replace(/\/(?:history|new)$/, ''),
    ]);
  },
);

it('renders the rest action with a moon and the standard Arabic label', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const html = renderToStaticMarkup(createElement(PlayerTabsView, { pathname: '/player', locale: 'ar', style: 'standard', label: 'nav',
    workout: { href: '/player', labelKey: 'v4RestDay', rest: true } }));
  expect(html).toContain('aria-label="اليوم راحة، عد للرئيسية"');
  expect(html).toContain('lucide-moon');
});

it('renders five slots in logical order with the assessments tab active', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(PlayerTabsView, {
    pathname: '/player/assessments', locale: 'ar', label: 'التنقل',
  }));
  expect([...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])).toEqual([
    '/player', '/player/nutrition', '/player', '/player/progress', '/player/assessments',
  ]);
  expect(html).toMatch(/href="\/player\/assessments"[^>]*aria-current="page"/);
  expect(html).toContain('min-h-14');
});

const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'program', title: '', notes: null,
  settings: {}, training_days: [1, 2], days: [{ id: 'day', title: '', position: 1, exercises: [] }] };

it('opens the same scheduled training day as home', () => {
  expect(workoutTarget(snapshot, [], '2026-11-03')).toEqual({ href: '/player/workout/day', labelKey: 'v4StartWorkout', rest: false });
});

it('returns home for rest, readiness rest and no program', () => {
  expect(workoutTarget(snapshot, [], '2026-11-04')).toEqual({ href: '/player', labelKey: 'v4RestDay', rest: true });
  expect(workoutTarget(snapshot, [], '2026-11-03', true).href).toBe('/player');
  expect(workoutTarget(null, [], '2026-11-03')).toEqual({ href: '/player', labelKey: 'v4NoProgram', rest: false });
});

it('keeps an in-progress day and ignores sessions outside the program', () => {
  const session: WorkoutSessionRow = { id: 'session', program_day_id: 'day', training_date: '2026-11-04',
    started_at: '', completed_at: null, client_updated_at: '' };
  expect(workoutTarget(snapshot, [session], '2026-11-04').href).toBe('/player/workout/day');
  expect(workoutTarget(snapshot, [{ ...session, program_day_id: 'old-day' }], '2026-11-04').rest).toBe(true);
});

it('handles weekly rest days, missing weekdays and completed cycles', () => {
  const weekly = { ...snapshot, starts_on: '2026-10-31', days: [
    { ...snapshot.days[0], id: 'rest', title: '', position: 1, exercises: [], weekday: 4, is_rest_day: true },
  ] };
  expect(workoutTarget(weekly, [], '2026-11-04').labelKey).toBe('v4RestDay');
  expect(workoutTarget(weekly, [], '2026-11-03').href).toBe('/player');
  expect(workoutTarget(weekly, [], '2026-12-01').href).toBe('/player');
});

it.each([['ar', 'ابدأ تمرين النهارده'], ['en', "Start today's workout"]] as const)('labels the workout action in %s', (locale, label) => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(PlayerTabsView, { pathname: '/player', locale, label: 'nav',
    workout: { href: '/player/workout/day', labelKey: 'v4StartWorkout', rest: false } }));
  expect(html).toContain(`aria-label="${label.replaceAll("'", '&#x27;')}"`);
});
