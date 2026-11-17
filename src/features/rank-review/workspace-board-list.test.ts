import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LeaderboardRow } from '@/features/ranks';
import { WorkspaceBoardList } from './components/workspace-board-list';

const player: LeaderboardRow = {
  player_id: 'player-1', display_name: 'Mona Ali', lifetime: 120, monthly: 84,
  adherence: 75, done: 6, planned: 8, tier: 'champion', is_crown: true, position: 1,
};
const render = (rows: LeaderboardRow[], allTime = false) => renderToStaticMarkup(
  createElement(WorkspaceBoardList, { rows, locale: 'en', allTime }),
);

describe('workspace ranking list', () => {
  it('links players and shows monthly workouts and points', () => {
    const html = render([player]);
    expect(html).toContain('href="/captain/players/player-1"');
    expect(html).toContain('Mona Ali');
    expect(html).toContain('6 workouts');
    expect(html).toContain('84 points');
    expect(html).toContain('tabular-nums');
    expect(html).not.toContain('120 points');
    expect(html).toContain('aria-label="Bronze"');
  });
  it.each([[0, 'Iron'], [300, 'Gold'], [900, 'Legend']] as const)(
    'shows the medal at %i lifetime points', (lifetime, label) => {
      expect(render([{ ...player, lifetime }])).toContain(`aria-label="${label}"`);
    },
  );
  it('uses lifetime points without mislabelling monthly workouts as lifetime', () => {
    const html = render([player], true);
    expect(html).toContain('120 points');
    expect(html).not.toContain('workouts');
  });
  it('does not link an unavailable player id', () => {
    expect(render([{ ...player, player_id: null }])).not.toContain('href=');
  });
  it('shows the empty state', () => {
    expect(render([])).toContain('No players yet');
  });
});
