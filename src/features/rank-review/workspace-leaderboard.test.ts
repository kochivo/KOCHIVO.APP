import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkspaceLeaderboard } from './components/workspace-leaderboard';

const board = {
  now: new Date('2026-11-14T12:00:00Z'), month: '2026-11-01', error: false,
  setMonth: () => {}, reload: () => {}, savePrize: async () => {},
};

describe('workspace leaderboard', () => {
  it('keeps prize editing reachable even with an empty board', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, rows: [] },
    }));
    expect(html).toContain('No players yet');
    expect(html).toContain('Set a prize for this month');
    expect(html).toContain('Set next month');
  });
  it('keeps the existing prize editor available after selecting next month', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, month: '2026-12-01', rows: [], prize: 'Team prize' },
    }));
    expect(html).toContain('Team prize');
    expect(html).toContain('Edit prize');
    expect(html).toContain('This month');
  });
  it('shows loading before rows arrive', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, { locale: 'en', board }));
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('No players yet');
  });
  it('shows a retry action on failure', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, error: true },
    }));
    expect(html).toContain('Could not load the ranking');
    expect(html).toContain('Try again');
  });
});
