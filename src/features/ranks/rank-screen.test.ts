import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { levelUpStorageKey, shouldCelebrate } from './level-up';
import { RankHero } from './components/rank-hero';
import { RankJourney } from './components/rank-journey';
import { CrownRace } from './components/crown-race';
import { TeamBoard } from './components/team-board';
import { PointsLog } from './components/points-log';
import { RankScreen } from './components/rank-screen';
import { LevelUpPanel } from './components/level-up-panel';
import { RankChip } from './components/rank-chip';
import type { MyPoints } from './data/load-my-points';

const points: MyPoints = { lifetime: 99, tier: 'beginner', monthly: 12, month_position: 2, crown_gap: 9, logs: [] };
const render = (child: ReactElement, locale: Locale = 'en') =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));

describe('player ranks', () => {
  it('renders the celebration dialog and a labelled home link', () => {
    const panel = render(createElement(LevelUpPanel, { tier: 'champion', onClose: () => {} }));
    expect(panel).toContain('<dialog');
    expect(panel).toContain('Congratulations! You reached Champion');
    expect(panel).toContain('>Continue</button>');
    const chip = render(createElement(RankChip, { points }));
    expect(chip).toContain('href="/player/rank"');
    expect(chip).toContain('aria-label="Open your rank: Beginner, 99 points"');
    expect(chip).toContain('min-h-12');
    expect(render(createElement(RankChip))).toBe('');
  });
  it('keeps separate celebration history for each player', () => {
    const storage = new Map([[levelUpStorageKey('player-a'), 'beginner']]);
    expect(shouldCelebrate(storage.get(levelUpStorageKey('player-b')) ?? null, 'legend')).toBe(false);
    expect(shouldCelebrate(storage.get(levelUpStorageKey('player-a')) ?? null, 'champion')).toBe(true);
  });
  it('celebrates only an increase after a known visit', () => {
    expect(shouldCelebrate(null, 'legend')).toBe(false);
    expect(shouldCelebrate('champion', 'champion')).toBe(false);
    expect(shouldCelebrate('beginner', 'champion')).toBe(true);
    expect(shouldCelebrate('legend', 'elite')).toBe(false);
    expect(shouldCelebrate('invalid', 'elite')).toBe(false);
  });

  it.each([[0, '100 points to Champion'], [99, '1 points to Champion'],
    [100, '200 points to Elite'], [600, 'Top rank reached']] as const)('shows progress at %s', (lifetime, text) => {
    const html = render(createElement(RankHero, { lifetime }));
    expect(html).toContain(text);
    expect(html).toContain(`>${lifetime}</p>`);
    expect(html.includes('role="progressbar"')).toBe(lifetime !== 600);
    expect(html).toContain('width="140"');
  });

  it.each([[0, 3], [100, 2], [300, 1], [600, 0]])('locks future tiers at %s', (lifetime, locked) => {
    const html = render(createElement(RankJourney, { lifetime }));
    expect(html.match(/grayscale opacity-30/g)?.length ?? 0).toBe(locked);
    expect(html.match(/width="64"/g)).toHaveLength(4);
  });

  it('distinguishes the crown holder and chaser, and explains the reset', () => {
    expect(render(createElement(CrownRace, { points, holdsCrown: true }))).toContain('You hold the crown this month');
    const html = render(createElement(CrownRace, { points, holdsCrown: false }));
    expect(html).toContain('9 points to the crown');
    expect(html).toContain('Resets on the 1st of each month');
    expect(html).toContain('Position 2');
  });

  it('highlights only the own row and shows first names', () => {
    const html = render(createElement(TeamBoard, { rows: [
      { player_id: null, display_name: 'Other Person', lifetime: 300, tier: 'elite', monthly: 30, is_crown: true, position: 1 },
      { player_id: 'self', display_name: 'My Name', lifetime: 99, tier: 'beginner', monthly: 12, is_crown: false, position: 2 },
    ] }));
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('bg-lime-soft');
    expect(html).toContain('>Other</span>');
    expect(html).not.toContain('Other Person');
    expect(html).toContain('aria-label="Crown"');
  });

  it('shows pending and rejected labels and formats earned dates', () => {
    const logs: MyPoints['logs'] = ['pending', 'rejected'].map((status, index) => ({
      id: String(index), player_id: 'self', captain_id: 'coach', kind: 'inbody', source_key: 'scan',
      points: 3, status: status as 'pending' | 'rejected', earned_on: '2026-11-09',
      created_at: '2026-11-09T12:00:00Z', reviewed_at: null,
    }));
    const html = render(createElement(PointsLog, { logs }));
    expect(html).toContain('Waiting for captain review');
    expect(html).toContain('Rejected');
    expect(html).toContain('dateTime="2026-11-09"');
  });

  it('shows empty states and both languages', () => {
    expect(render(createElement(PointsLog, { logs: [] }))).toContain('No points yet. Finish your first workout');
    expect(render(createElement(TeamBoard, { rows: [] }))).toContain('Nobody has points this month');
    expect(render(createElement(CrownRace, { points: { ...points, month_position: null }, holdsCrown: false }))).toContain('Join a captain');
    expect(render(createElement(RankHero, { lifetime: 99 }), 'ar')).toContain('فاضلك 1 نقطة لرتبة بطل');
    expect(render(createElement(PointsLog, { logs: [] }), 'ar')).toContain('لسه ما كسبتش نقط. كمّل أول تمرين');
  });

  it('hides the board without a captain and keeps all rewards visible in the last ten logs', () => {
    const html = render(createElement(RankScreen, {
      data: { points: { ...points, month_position: null }, board: [] }, status: 'ready',
    }));
    expect(html).toContain('Join a captain');
    expect(html).not.toContain('Your team');
    const kinds = ['workout', 'pr', 'perfect_week', 'inbody', 'meal_check'] as const;
    const logs: MyPoints['logs'] = Array.from({ length: 11 }, (_, index) => ({
      id: String(index), player_id: 'self', captain_id: 'coach', kind: kinds[index % 5] ?? 'workout',
      source_key: String(index), points: 3, status: 'counted', earned_on: '2026-11-09',
      created_at: '2026-11-09T12:00:00Z', reviewed_at: null,
    }));
    const log = render(createElement(PointsLog, { logs }));
    expect(log.match(/<li /g)).toHaveLength(10);
    for (const label of ['Workout', 'Personal record', 'Perfect week', 'InBody scan', 'Meal check']) expect(log).toContain(label);
    const arabic = render(createElement(CrownRace, { points, holdsCrown: true }), 'ar');
    expect(arabic).toContain('التاج معاك الشهر ده');
  });

  it('renders supplied data, loading and retry states without fetching', () => {
    const html = render(createElement(RankScreen, { data: { points, board: [] }, status: 'ready' }));
    expect(html).toContain('Your rank');
    expect(html).not.toMatch(/(?:ml-|mr-|pl-|pr-|left-|right-)/);
    expect(render(createElement(RankScreen, { status: 'error', onRetry: () => {} }))).toContain('Try again');
    expect(render(createElement(RankScreen, { status: 'loading' }))).toContain('role="status"');
  });
});
