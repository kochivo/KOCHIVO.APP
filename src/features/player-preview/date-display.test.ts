import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PreviewWeek } from './components/preview-week';
import { PreviewScreen } from './components/preview-screen';
import type { ProgramSnapshot } from '@/features/player-home';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('server-only', () => ({}));

it('keeps preview dates and weekday labels in Arabic', () => {
  const week = [{ date: '2026-11-03', trained: false, mealsEaten: 0 }];
  const html = renderToStaticMarkup(createElement(PreviewWeek, { week, today: '2026-11-03' }));
  expect(html).toContain('الثلاثاء، 3 نوفمبر');
  const screen = renderToStaticMarkup(createElement(PreviewScreen, { playerId: 'player',
    today: '2026-11-03', result: { data: { name: 'علي', program: null, todayDay: null, nutrition: null, sessions: [], week } },
  }));
  expect(screen).toContain('<span class="whitespace-nowrap text-micro" title="الثلاثاء">تلات</span>');
});

it('shows the selected day once and leaves no media block for exercises without media', () => {
  const day = { id: 'day', position: 1, title: 'اليوم التالت', exercises: [{ id: 'row', exercise_id: 'ex',
    position: 1, name_ar: 'سكوات', name_en: 'Squat', sets: 12, reps_min: 8, reps_max: 8,
    rest_seconds: 60, superset_group: null, media_path: null, rpe: null, tempo: null, notes: null }] };
  const program: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'plan', title: 'خطة',
    notes: null, settings: {}, training_days: [], days: [day] };
  const html = renderToStaticMarkup(createElement(PreviewScreen, { playerId: 'player',
    today: '2026-11-05', result: { data: { name: 'علي', program, todayDay: day, nutrition: null,
      sessions: [], week: [{ date: '2026-11-05', trained: false, mealsEaten: 0 }] } },
  }));
  expect(html.match(/اليوم التالت/g)).toHaveLength(1);
  expect(html).toContain('12 مجموعة');
  expect(html).not.toContain('aspect-ratio');
  expect(html).toContain('title="الخميس">خميس');
});
