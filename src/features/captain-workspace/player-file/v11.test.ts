import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { Measurements } from './measurements';
import { TrainingAdherence } from './training-adherence';
import { PlayerOverview } from './overview';
import { PhoneOverview } from './phone-overview';
import type { FileSummary, Profile } from './types';
import type { FileActivity } from './load-activity';

vi.mock('server-only', () => ({}));
vi.mock('./profile-section', () => ({ ProfileSection: () => null }));

it('renders signed change pills and hides missing metrics', () => {
  const html = renderToStaticMarkup(createElement(Measurements, { locale: 'en', metrics: [
    { key: 'weight', value: 82.4, change: 1.2 }, { key: 'bodyFat', value: 16, change: -0.8 },
  ] }));
  expect(html).toContain('+1.2');
  expect(html).toContain('−0.8');
  expect(html).not.toContain('Best squat');
  expect(html).not.toContain('—');
});
it('describes completed and planned training days without inventing a target', () => {
  const render = (planned: number) => renderToStaticMarkup(createElement(TrainingAdherence, { completed: 3, planned, rpe: null, locale: 'en' }));
  expect(render(4)).toContain('3 of 4 this week');
  expect(render(4)).not.toContain('Last RPE');
  expect(render(0)).not.toContain('3 of 0');
});

const profile: Profile = { name: 'Ali', checkIns: [], intake: null, program: null, nutrition: null };
const summary: FileSummary = { file: { facts: {}, history: [] }, completedDays: 0, lastTraining: null, assessment: null,
  subscription: { access_until: '2026-12-01', started_on: '2026-11-01', pending: false, frozen_at: null, sessions_left: null } };
const activity: FileActivity = { scans: [], last: null, sets: [], nutrition: null };
it('hides every missing measurement from the real overview', () => {
  const html = renderToStaticMarkup(createElement(PlayerOverview, { playerId: 'p', profile, summary, activity, locale: 'en', today: '2026-11-14' }));
  expect(html).toContain('No measurements yet');
  for (const label of ['Body fat', 'Best squat', '—']) expect(html).not.toContain(label);
});
it('uses chronological scan measurements for current values and change pills', () => {
  const html = renderToStaticMarkup(createElement(PlayerOverview, { playerId: 'p', profile, summary,
    activity: { ...activity, scans: [
      { scan_date: '2026-11-14', weight_kg: 82.4, fat_pct: 16 },
      { scan_date: '2026-10-14', weight_kg: 81.2, fat_pct: 16.8 },
    ] }, locale: 'en', today: '2026-11-14' }));
  for (const value of ['82.4', '+1.2', '−0.8']) expect(html).toContain(value);
  expect(html).not.toContain('Best squat');
});

it('limits the phone stat strip and week dots to the phone and uses completed dates', () => {
  const html = renderToStaticMarkup(createElement(PhoneOverview, { locale: 'en', today: '2026-11-18',
    profile: { ...profile, program: { title: 'Plan', updatedAt: '2026-11-13', days: 2, exercises: 4 } },
    summary: { ...summary, completedDays: 1, completedDates: ['2026-11-14'] },
    activity: { ...activity, scans: [{ scan_date: '2026-11-14', weight_kg: 82.4, fat_pct: null },
      { scan_date: '2026-11-18', weight_kg: 81.2, fat_pct: null }] },
  }));
  for (const value of ['md:hidden', 'hairline-cells', '81.2', '−1.2', '50%', 'Saturday: Trained', 'Sunday: No workout logged']) {
    expect(html).toContain(value);
  }
  expect(html.match(/<li /g)).toHaveLength(7);
});
