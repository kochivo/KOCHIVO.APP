import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
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
import { RankBadge } from '@/ui/rank-badge';
import { recordLegendStars } from './hooks/use-level-up';
import type { MyPoints } from './data/load-my-points';

const points: MyPoints = { lifetime: 99, tier: 'beginner', monthly: 55, month_position: 2, crown_gap: 9,
  adherence: 50, done: 4, planned: 8, crown_needs_workouts: 0, logs: [] };
const render = (child: ReactElement, locale: Locale = 'en') =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));

describe('player ranks', () => {
  it('orders the v4 hero, board, points log and medals, with an empty log', () => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
    try {
      const html = render(createElement(RankScreen, { data: { points: { ...points, lifetime: 0 }, board: [],
        medals: { workouts: 0, full_weeks: 0, prs: 0, crowns: 0, crown_streak: 0 } } }));
      expect(html.match(/data-rank-section="[^"]+"/g)).toEqual([
        'data-rank-section="hero"', 'data-rank-section="board"', 'data-rank-section="points"', 'data-rank-section="medals"',
      ]);
      expect(html).toContain('No points yet. Finish your first workout');
      expect(html).toContain('More points history is needed for an estimate');
    } finally { vi.unstubAllEnvs(); }
  });
  it('celebrates each star once per player and preserves the highest seen count', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(recordLegendStars(storage, 'a', 1)).toBe(false);
    storage.setItem(levelUpStorageKey('a'), 'legend');
    expect(recordLegendStars(storage, 'a', 1)).toBe(false);
    expect(recordLegendStars(storage, 'a', 2)).toBe(true);
    expect(recordLegendStars(storage, 'a', 2)).toBe(false);
    expect(recordLegendStars(storage, 'a', 1)).toBe(false);
    expect(recordLegendStars(storage, 'a', 2)).toBe(false);
    expect(recordLegendStars(storage, 'b', 2)).toBe(false);
    storage.setItem(levelUpStorageKey('b'), 'legend');
    expect(recordLegendStars(storage, 'b', 3)).toBe(true);
  });
  it('renders the celebration dialog and a labelled home link', () => {
    const panel = render(createElement(LevelUpPanel, { tier: 'champion', onClose: () => {} }));
    expect(panel).toContain('<dialog');
    expect(panel).toContain('Congratulations! You reached Champion');
    expect(panel).toContain('>Continue</button>');
    const chip = render(createElement(RankChip, { points }));
    expect(chip).toContain('href="/player/rank"');
    expect(chip).toContain('aria-label="Open your rank: Iron, 99 points"');
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

  it.each([[0, '100 points to Bronze'], [99, '1 points to Bronze'],
    [100, '100 points to Silver'], [600, '300 points to Legend']] as const)('shows progress at %s', (lifetime, text) => {
    const html = render(createElement(RankHero, { lifetime }));
    expect(html).toContain(text);
    expect(html).toContain(`>${lifetime} points</p>`);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('width="96"');
  });

  it.each(['ar', 'en'] as const)('renders Legend stars throughout the rank UI in %s', locale => {
    const label = locale === 'ar' ? 'أسطورة ★1' : 'Legend ★1';
    const hero = render(createElement(RankHero, { lifetime: 1200 }), locale);
    expect(hero).toContain(label);
    expect(hero).toContain(locale === 'ar' ? 'فاضلك 300 نقطة على النجمة 2' : '300 points to star 2');
    expect(hero).toContain('aria-valuenow="0"');
    expect(render(createElement(RankJourney, { lifetime: 1200 }), locale)).toContain(
      locale === 'ar' ? 'نجوم الأسطورة: كل 300 نقطة نجمة' : 'Legend stars: one every 300 points');
    expect(render(createElement(RankChip, { points: { ...points, lifetime: 1200, tier: 'legend' } }), locale)).toContain(label);
    expect(render(createElement(LevelUpPanel, { tier: 'legend', stars: 2, onClose: () => {} }), locale)).toContain(
      locale === 'ar' ? 'نجمة جديدة! بقيت أسطورة ★2' : 'New star! Legend ★2');
  });

  it.each([0, 1, 5, 7])('renders %i decorative badge stars without changing the accessible label', stars => {
    for (const locale of ['ar', 'en'] as const) {
      const label = `${locale === 'ar' ? 'أسطورة' : 'Legend'} ★${stars}`;
      const html = render(createElement(RankBadge, { tier: 'legend', stars, label }), locale);
      expect(html).toContain(`aria-label="${label}"`);
      if (stars) {
        expect(html).toContain('aria-hidden="true"');
        if (stars > 5) expect(html).toContain('★×7');
        else expect(html.match(/lucide-star/g)).toHaveLength(stars);
      } else expect(html).toBe(render(createElement(RankBadge, { tier: 'legend', label }), locale));
    }
  });

  it.each([[0, 5], [100, 4], [300, 2], [600, 0]])('locks future tiers at %s', (lifetime, locked) => {
    const html = render(createElement(RankJourney, { lifetime }));
    expect(html.match(/data-part="lock"/g)?.length ?? 0).toBe(locked);
    expect(html.match(/width="64"/g)).toHaveLength(7);
  });

  it.each(['ar', 'en'] as const)('shows adherence, workouts and the rule for the holder and chaser in %s', locale => {
    for (const holdsCrown of [true, false]) {
      const html = render(createElement(CrownRace, { points, holdsCrown }), locale);
      expect(html).toContain(locale === 'ar' ? 'التزامك 50٪' : '50% of your plan');
      expect(html).toContain(locale === 'ar' ? '4 من 8 تمرين الشهر ده' : '4 of 8 workouts this month');
      expect(html).toContain(locale === 'ar' ? 'بحد أدنى 4 تمارين' : 'at least 4 workouts this month');
      expect(html).toContain(locale === 'ar' ? 'الأرقام الجديدة والـInBody' : 'Records and InBody scans');
      expect(html).toContain(locale === 'ar' ? 'السباق بيبدأ من جديد يوم 1' : 'Resets on the 1st');
      expect(html).toContain('glass-strong');
      expect(html).not.toContain(locale === 'ar' ? 'نقطة الشهر ده' : 'points this month');
      if (holdsCrown) {
        expect(html).toContain(locale === 'ar' ? 'التاج معاك الشهر ده' : 'You hold the crown this month');
        expect(html).toContain(locale === 'ar' ? 'aria-label="التاج"' : 'aria-label="Crown"');
        expect(html).not.toContain(locale === 'ar' ? 'فاضلك' : 'to the crown');
      } else {
        expect(html).toContain(locale === 'ar' ? 'فاضلك 9 درجة وتاخد التاج' : '9 to the crown');
        expect(html).toContain(locale === 'ar' ? 'المركز 2' : 'Position 2');
      }
    }
  });

  it.each(['ar', 'en'] as const)('prioritizes missing workouts over the gap in %s', locale => {
    for (const needed of [1, 2, 4]) {
      const html = render(createElement(CrownRace, {
        points: { ...points, done: 4 - needed, crown_needs_workouts: needed }, holdsCrown: false,
      }), locale);
      const english = needed === 1 ? '1 more workout to enter the crown race' : `${needed} more workouts to enter the crown race`;
      const arabic = needed === 1 ? 'فاضلك تمرين واحد عشان تدخل سباق التاج' : `فاضلك ${needed} تمارين عشان تدخل سباق التاج`;
      expect(html).toContain(locale === 'ar' ? arabic : english);
      expect(html).toContain(locale === 'ar' ? 'المركز 2' : 'Position 2');
      expect(html).not.toContain(locale === 'ar' ? 'درجة وتاخد التاج' : 'to the crown');
    }
  });

  it('highlights only the own row and shows first names', () => {
    const html = render(createElement(TeamBoard, { rows: [
      { player_id: null, display_name: 'Other Person', lifetime: 300, tier: 'elite', monthly: 88,
        adherence: 75, done: 6, planned: 8, is_crown: true, position: 1 },
      { player_id: 'self', display_name: 'My Name', lifetime: 99, tier: 'beginner', monthly: 55,
        adherence: 50, done: 4, planned: 8, is_crown: false, position: 2 },
    ] }));
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('bg-lime-soft');
    expect(html).toContain('>Other</span>');
    expect(html).not.toContain('Other Person');
    expect(html).toContain('aria-label="Crown"');
    expect(html).toContain('75%'); expect(html).toContain('50%');
    expect(html).not.toContain('88 points');
  });

  it.each(['ar', 'en'] as const)('shows team adherence and uses workouts for the empty state in %s', locale => {
    const row = { player_id: null, display_name: 'Mona', lifetime: 300, tier: 'elite' as const,
      monthly: 13, adherence: 0, done: 0, planned: 8, is_crown: false, position: 1 };
    const empty = locale === 'ar' ? 'لسه محدش اتمرن الشهر ده' : 'Nobody has trained this month';
    expect(render(createElement(TeamBoard, { rows: [] }), locale)).toContain(empty);
    expect(render(createElement(TeamBoard, { rows: [row] }), locale)).toContain(empty);
    const html = render(createElement(TeamBoard, { rows: [{ ...row, monthly: 0, adherence: 13, done: 1 }] }), locale);
    expect(html).toContain(locale === 'ar' ? '13٪' : '13%');
    expect(html).not.toContain(empty);
  });

  it.each(['ar', 'en'] as const)('labels uncounted points and strikes through only their values in %s', locale => {
    const logs: MyPoints['logs'] = ['pending', 'rejected', 'counted'].map((status, index) => ({
      id: String(index), player_id: 'self', captain_id: 'coach', kind: 'inbody', source_key: 'scan',
      points: 3, status: status as 'pending' | 'rejected' | 'counted', earned_on: '2026-11-09',
      created_at: '2026-11-09T12:00:00Z', reviewed_at: null,
    }));
    const html = render(createElement(PointsLog, { logs }), locale);
    expect(html).toContain(locale === 'ar' ? 'ما اتحسبش: التمرين قصير أو مجموعاته ناقصة' : 'Not counted: workout too short or sets missing');
    expect(html).toContain(locale === 'ar' ? '>ما اتحسبش</p>' : '>Not counted</p>');
    expect(html.match(/<span class="[^"]*line-through text-muted[^"]*">[^<]+<\/span>/g)).toHaveLength(2);
    expect(html.match(/<span class="text-sm font-bold">[^<]+<\/span>/g)).toHaveLength(1);
    expect(html).toContain('dateTime="2026-11-09"');
  });

  it('shows empty states and both languages', () => {
    expect(render(createElement(PointsLog, { logs: [] }))).toContain('No points yet. Finish your first workout');
    expect(render(createElement(TeamBoard, { rows: [] }))).toContain('Nobody has trained this month');
    expect(render(createElement(CrownRace, { points: { ...points, month_position: null }, holdsCrown: false }))).toContain('Join a captain');
    expect(render(createElement(RankHero, { lifetime: 99 }), 'ar')).toContain('فاضلك 1 نقطة لرتبة برونز');
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
