import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardRow } from '@/features/ranks';
import { WorkspaceLeaderboard } from './components/workspace-leaderboard';

const resource = vi.hoisted(() => ({ prize: null as string | null }));
vi.mock('@/core/resource', () => ({
  useResource: () => ({ data: resource.prize, status: 'ready' }),
}));
vi.mock('@/ui/page-bar-actions', () => ({
  PageBarActions: ({ children }: { children: React.ReactNode }) => createElement('header', null, children),
}));
vi.mock('@/ui/page-bar-title', () => ({
  PageBarTitle: ({ subtitle }: { subtitle?: string }) => createElement('p', null, subtitle),
}));

const board = {
  now: new Date('2026-11-18T12:00:00Z'), month: '2026-11-01', error: false,
  setMonth: () => {}, reload: () => {}, savePrize: async () => {},
};
const player: LeaderboardRow = {
  player_id: 'one', display_name: 'Youssef Ahmed', lifetime: 6, monthly: 5,
  adherence: 5, done: 3, planned: 8, tier: 'beginner', is_crown: false, position: 1,
};

beforeEach(() => { resource.prize = null; });

describe('workspace leaderboard', () => {
  it('shows a single current prize and a distinct next-month setup action on an empty team', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, rows: [], prize: 'Free month' },
    }));
    expect(html).toContain('No players yet');
    expect(html.match(/Free month/g)).toHaveLength(1);
    expect(html).toContain('November prize');
    expect(html).toContain('December prize');
    expect(html).toContain('Set prize');
  });
  it('renders the saved next-month prize when available', () => {
    resource.prize = 'Team prize';
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, rows: [] },
    }));
    expect(html).toContain('Team prize');
  });
  it('opens the existing editor prefilled for the selected next month', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, month: '2026-12-01', rows: [], prize: 'Team prize' },
    }));
    expect(html).toContain('value="Team prize"');
    expect(html).toContain('>Save</button>');
    expect(html).toContain('>Cancel</button>');
  });
  it('puts a no-wrap period switch in the header actions and shows the month countdown', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, { locale: 'ar', board }));
    expect(html).toContain('نوفمبر · باقي 12 يوم على نهاية الشهر');
    expect(html.match(/<header>.*?<\/header>/)?.[0]).toMatch(/whitespace-nowrap[^>]*>.*الشهر ده.*كل الوقت/);
  });
  it('keeps zero-point players in order without a leader or a status prefix', () => {
    const rows = [{ ...player, monthly: 0 }, { ...player, monthly: 0, position: 2, player_id: 'two', display_name: 'Hesham' }];
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, { locale: 'ar', board: { ...board, rows } }));
    expect(html).not.toContain('الأول الشهر ده');
    expect(html).not.toContain('لسه');
    expect(html).toMatch(/>1<\/span>.*Youssef Ahmed.*>2<\/span>.*Hesham/);
  });
  it('shows the leader and keeps their row in the table', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceLeaderboard, {
      locale: 'en', board: { ...board, rows: [player] },
    }));
    expect(html).toContain('aria-label="First this month"');
    expect(html.match(/Youssef Ahmed/g)).toHaveLength(2);
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
