import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './sections/messages';
import { spotsLabel, statsCells, validSpecialties } from './public-sections';
import { PublicSpecialties } from './components/public-specialties';
import { PublicSpots } from './components/public-spots';
import { PublicFacts } from './components/public-facts';
import { PublicNumbers } from './components/public-numbers';

vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en' }));
const t = createT(messages, 'en');
const stats = { players: 12, workouts_logged: 4210, adherence_pct: 87, member_since: 2022 };
const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);
it('labels only scarce or full capacity, including zero', () => {
  expect(spotsLabel(11, true)).toBeNull();
  expect(spotsLabel(10, true)).toBe('spotsLeft');
  expect(spotsLabel(0, false)).toBe('full');
  expect(spotsLabel(8, false)).toBe('full');
});
it('builds truthful cells and omits unknown experience and hidden statistics', () => {
  expect(statsCells(null, 8)).toEqual([]);
  expect(statsCells(stats, null).map(cell => cell.value)).toEqual([12, 4210, 87]);
  expect(statsCells(stats, 0).map(cell => cell.value)).toEqual([12, 4210, 87, 0]);
});
it('validates specialty count and Unicode lengths', () => {
  expect(validSpecialties([])).toBe(true);
  expect(validSpecialties(['تنشيف', 'Strength'])).toBe(true);
  for (const value of [['a'], [' '.repeat(3)], ['a'.repeat(31)], Array<string>(7).fill('Valid')]) expect(validSpecialties(value)).toBe(false);
});
it('renders angled specialties only when present', () => {
  expect(html(createElement(PublicSpecialties, { items: [] }))).toBe('');
  expect(html(createElement(PublicSpecialties, { items: ['Strength'] }))).toContain('Strength');
});
it('renders ten spots segments, hides plentiful capacity and shows full copy', () => {
  expect(html(createElement(PublicSpots, { spots: 11, accepting: true, t }))).toBe('');
  const scarce = html(createElement(PublicSpots, { spots: 4, accepting: true, t }));
  expect(scarce).toContain('4 spots left');
  expect(scarce.match(/data-segment/g)).toHaveLength(10);
  expect(html(createElement(PublicSpots, { spots: 0, accepting: false, t }))).toContain(messages.en.full);
});
it('hides empty facts and renders zero experience and translated languages', () => {
  expect(html(createElement(PublicFacts, { years: null, languages: [], t }))).toBe('');
  const facts = html(createElement(PublicFacts, { years: 0, languages: ['ar', 'en'], t }));
  expect(facts).toContain('Arabic'); expect(facts).toContain('English'); expect(facts).toContain('>0<');
});
it('hides absent stats and renders formatted numbers, units and the honesty line', () => {
  expect(html(createElement(PublicNumbers, { stats: null, years: 8, t }))).toBe('');
  const numbers = html(createElement(PublicNumbers, { stats, years: 8, t }));
  expect(numbers).toContain('4,210'); expect(numbers).toContain('dir="ltr"');
  expect(numbers).toContain(messages.en.honesty);
});
