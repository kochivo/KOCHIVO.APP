import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ScanMetrics } from './components/scan-metrics';
import type { Scan } from './types';

const first: Scan = {
  id: 'first', player_id: 'player', scan_date: '2026-09-01',
  weight_kg: 90, muscle_kg: 35, fat_pct: 25, file_path: null, created_at: '',
};
const second: Scan = { ...first, id: 'second', scan_date: '2026-10-01', weight_kg: 88, muscle_kg: 36, fat_pct: 23 };
const third: Scan = { ...first, id: 'third', scan_date: '2026-11-01', weight_kg: 87, muscle_kg: 37.5, fat_pct: 22.5 };
const render = (scans: Scan[], total = true) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(ScanMetrics, { scans, total, target: 80 })));
const primary = (html: string, label: string) => html.match(new RegExp(`<h3[^>]*>${label}</h3><p[^>]*>([^<]+)`))?.[1]?.trim();

describe('current InBody metrics', () => {
  it.each([true, false])('shows a first scan immediately in captain-total=%s mode without inventing a comparison', total => {
    const html = render([first], total);
    expect(primary(html, 'Weight')).toBe('90');
    expect(primary(html, 'Muscle mass')).toBe('35');
    expect(primary(html, 'Body fat')).toBe('25');
    expect(html.match(/Two measurements needed to compare/g)).toHaveLength(3);
  });

  it('keeps latest measurements primary with two records and shows the comparison separately', () => {
    const html = render([first, second]);
    expect(primary(html, 'Weight')).toBe('88');
    expect(primary(html, 'Muscle mass')).toBe('36');
    expect(primary(html, 'Body fat')).toBe('23');
    expect(html).toContain('-2 kg Weight');
    expect(html).toContain('+1 kg Muscle mass');
    expect(html).not.toContain('Two measurements needed to compare');
  });

  it('preserves first-to-latest coach changes and adjacent player changes with three records', () => {
    const coach = render([first, second, third]);
    const player = render([first, second, third], false);
    expect(primary(coach, 'Weight')).toBe('87');
    expect(primary(player, 'Weight')).toBe('87');
    expect(coach).toContain('-3 kg Weight');
    expect(player).toContain('-1 kg Weight');
  });

  it('keeps genuinely missing current measurements unknown without hiding recorded values', () => {
    const html = render([{ ...first, muscle_kg: null }]);
    expect(primary(html, 'Weight')).toBe('90');
    expect(primary(html, 'Muscle mass')).toBe('—');
    expect(primary(html, 'Body fat')).toBe('25');
  });

  it('treats zero change as a valid comparison and handles no records without invented metrics', () => {
    const html = render([first, { ...second, weight_kg: 90, muscle_kg: 35, fat_pct: 25 }]);
    expect(primary(html, 'Weight')).toBe('90');
    expect(html).toContain('0 kg Weight');
    expect(html).not.toContain('Two measurements needed to compare');
    expect(primary(render([]), 'Weight')).toBe('—');
  });
});
