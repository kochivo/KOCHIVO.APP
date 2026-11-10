import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LeaderboardScreen } from './components/leaderboard-screen';

it.each(['ar', 'en'] as const)('places frozen history after the captain board in %s', locale => {
  const board = { month: '2026-11-01', rows: [], error: false, setMonth: () => {}, reload: () => {},
    hall: [{ month: '2026-10-01', player_id: null, display_name: 'Mona Private', adherence: 50, done: 4, planned: 8 }] };
  const render = (hall = board.hall) => renderToStaticMarkup(createElement(LeaderboardScreen, { locale, board: { ...board, hall } }));
  const html = render();
  expect(html).toContain('Mona Private');
  expect(html).toContain(locale === 'ar' ? 'أكتوبر' : 'October');
  expect(html).toContain(locale === 'ar' ? '50٪ التزام' : '50% adherence');
  expect(render([])).toContain(locale === 'ar' ? 'لسه محدش أخد التاج' : 'No crown winners yet');
});
