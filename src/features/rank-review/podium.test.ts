import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LeaderboardRow } from '@/features/ranks';
import { Podium } from './components/podium';

const rows: LeaderboardRow[] = [1, 2, 3, 4].map(position => ({
  player_id: `player-${position}`, display_name: `Player${position} Family`, position,
  lifetime: 100, monthly: 20, adherence: 80, done: 8, planned: 10,
  tier: 'beginner', is_crown: false,
}));
const render = (players: LeaderboardRow[]) => renderToStaticMarkup(createElement(Podium, { rows: players, locale: 'en' }));

describe('podium', () => {
  it('shows second, first and third in that order, using first names only', () => {
    const html = render(rows);
    expect(html.indexOf('Player2')).toBeLessThan(html.indexOf('Player1'));
    expect(html.indexOf('Player1')).toBeLessThan(html.indexOf('Player3'));
    expect(html).not.toContain('Player4');
    expect(html).not.toContain('Family');
  });
  it.each([0, 1, 2])('renders only existing places for %i players', count => {
    const html = render(rows.slice(0, count));
    expect((html.match(/<li /g) ?? []).length).toBe(count);
    if (count === 2) expect(html.indexOf('Player2')).toBeLessThan(html.indexOf('Player1'));
  });
});
