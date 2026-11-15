import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RankJourney } from './components/rank-journey';
import { RankChip } from './components/rank-chip';
import { MedalSets } from './components/medal-sets';
import { EarnPoints } from './components/earn-points';

it('shows seven rank medals with next rank progress', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(RankJourney, { lifetime: 254 })));
  expect(html.match(/data-medal-rank=/g)).toHaveLength(7);
  expect(html).toContain('54%');
  expect(html).toContain('Legend');
});
it('shows the other medals counter and marks only today’s counted sources', () => {
  const sets = renderToStaticMarkup(createElement(LocaleProvider,{locale:'en'},createElement(MedalSets, {
    counts: { workouts: 10, full_weeks: 1, prs: 1, crowns: 0, crown_streak: 0 },
  })));
  expect(sets).toContain('4 of 20');
  const sheet = renderToStaticMarkup(createElement(LocaleProvider,{locale:'en'},createElement(EarnPoints, {
    expanded: true, today: '2026-11-15', logs: [{ id:'1',player_id:'p',captain_id:'c',kind:'workout',source_key:'s',
      points:3,status:'counted',earned_on:'2026-11-15',created_at:'2026-11-15T08:00Z',reviewed_at:null }],
  })));
  expect(sheet.match(/data-earned="true"/g)).toHaveLength(1);
  expect(sheet.match(/data-earned="false"/g)).toHaveLength(4);
  expect(sheet).toContain('Start today’s workout');
});
it('uses lifetime points for the rank chip', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(RankChip, {
    points: { lifetime: 254, tier: 'champion', monthly: 0, month_position: null, crown_gap: 0,
      adherence: 0, done: 0, planned: 8, crown_needs_workouts: 4, logs: [] },
  })));
  expect(html).toContain('Silver');
  expect(html).toContain('data-medal-rank="2"');
});
