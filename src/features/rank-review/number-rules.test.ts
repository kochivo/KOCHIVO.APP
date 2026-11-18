import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { LeaderboardRow } from '@/features/ranks';
import { Podium } from './components/podium';
import { WorkspaceBoardList } from './components/workspace-board-list';

const row: LeaderboardRow = { player_id: 'p', display_name: 'Ali', lifetime: 0, monthly: 0,
  done: 0, planned: 8, adherence: 0, position: 1, is_crown: false, tier: 'beginner' };
it('keeps zero point players off the podium and shows their rank in the workspace table', () => {
  expect(renderToStaticMarkup(createElement(Podium, { rows: [row], locale: 'en' }))).toBe('');
  const html = renderToStaticMarkup(createElement(WorkspaceBoardList, { rows: [row], locale: 'en', allTime: false }));
  expect(html).toContain('Ali');
  expect(html).toContain('>1</span>');
  expect(html).not.toContain('Not yet');
});
it('uses the selected period for podium eligibility', () => {
  const rows = [{ ...row, lifetime: 10 }];
  expect(renderToStaticMarkup(createElement(Podium, { rows, locale: 'en' }))).toBe('');
  expect(renderToStaticMarkup(createElement(Podium, { rows, locale: 'en', allTime: true }))).toContain('Ali');
});
it('formats workout and point counts independently', () => {
  const rows = [{ ...row, done: 13, monthly: 3 }];
  const ar = renderToStaticMarkup(createElement(WorkspaceBoardList, { rows, locale: 'ar', allTime: false }));
  expect(ar).toContain('>13</span>');
  expect(ar).toContain('>3</span>');
  const en = renderToStaticMarkup(createElement(WorkspaceBoardList, {
    rows: [{ ...row, done: 1, monthly: 1 }], locale: 'en', allTime: false,
  }));
  expect(en.match(/>1<\/span>/g)).toHaveLength(3);
});
