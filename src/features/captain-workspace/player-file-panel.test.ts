import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { formHistory, mergePlayerFile } from '@/features/player-file';
import type { Snapshot } from '@/features/player-file';
import { PlayerFilePanel } from './components/player-file-panel';
import { PlayerFileSummary } from './components/player-file-summary';

const intake: Snapshot = { source: { kind: 'intake', id: 'i', at: '2026-11-03T12:00:00Z' }, facts: {
  age: 27, height: 178, weight: 79, targetWeight: 86, trainingDays: [0, 1, 3, 4], sessionMinutes: 60,
  injuries: ['knee'], medical: ['asthma'], allergies: ['milk'], note: 'Build muscle',
} };
function render(snapshots: Snapshot[], locale: 'ar' | 'en' = 'en') {
  return renderToStaticMarkup(createElement(PlayerFilePanel, { name: 'Ahmed', locale, initialWeight: 79,
    file: { facts: mergePlayerFile(snapshots, new Date('2026-11-11T12:00:00Z')), history: formHistory(snapshots) },
  }));
}
it('renders intake facts, all seven Saturday-first days, a quote and first form', () => {
  const html = render([intake]);
  for (const value of ['Ahmed', '27 years', '178 cm', '79 kg', '86 kg', '60 min', 'Onboarding', 'First data', '<blockquote', 'Build muscle']) {
    expect(html).toContain(value);
  }
  expect(html.indexOf('Sat')).toBeLessThan(html.indexOf('Fri'));
  expect(html).toContain('aria-label="Sat: Training day"');
  expect(html).toContain('aria-label="Tue: Training day"');
  expect(html).toContain('aria-label="Mon: Rest"');
  expect(html).toContain('aria-valuenow="0"');
});
it('renders the previous value, dated source, new marker and newest-first translated changes', () => {
  const html = render([intake, { source: { kind: 'checkin', id: 'c', at: '2026-11-10T12:00:00Z' }, facts: { weight: 82.4 } }]);
  expect(html).toContain('82.4 kg');
  expect(html).toMatch(/<del[^>]*>79 kg<\/del>/);
  expect(html).toContain('Check-in · 10 Nov');
  expect(html).toContain('aria-label="New fact"');
  expect(html).toContain('Changed: Current weight');
  expect(html.indexOf('Changed:')).toBeLessThan(html.indexOf('First data'));
  expect(html).toContain('aria-valuenow="49"');
});
it('styles injuries and medical conditions as warnings and translates stored keys', () => {
  const html = render([intake]);
  expect(html).toMatch(/class="[^"]*bg-warn-soft[^\"]*text-warn[^\"]*">Knee/);
  expect(html).toContain('Asthma');
  expect(html).toContain('Milk');
});
it('isolates units in Arabic and handles absent facts and history', () => {
  expect(render([intake], 'ar')).toContain('dir="ltr"');
  const html = render([]);
  expect(html).toContain('No assessments yet');
  expect(html).toContain('Not provided');
  expect(html).not.toContain('0 kg');
});
it('shows the compact mobile facts and warning without dropping the target or schedule', () => {
  const html = renderToStaticMarkup(createElement(PlayerFileSummary, { locale: 'en',
    file: { facts: mergePlayerFile([intake], new Date('2026-11-11T12:00:00Z')), history: [] },
  }));
  for (const value of ['27 years', '178 cm', '79 kg → 86 kg', '4 days × 60 min', 'text-warn', 'Knee']) expect(html).toContain(value);
});
it.each([[90, 86, 100], [75, 86, 0], [75, 70, 44], [86, 79, 0]])(
  'clamps progress for current=%s target=%s', (weight, targetWeight, progress) => {
    const html = render([{ ...intake, facts: { ...intake.facts, weight, targetWeight } }]);
    expect(html).toContain(`aria-valuenow="${progress}"`);
  },
);
