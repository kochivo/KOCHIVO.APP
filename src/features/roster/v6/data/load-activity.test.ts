import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { loadActivity } from './load-activity';

const state = vi.hoisted(() => ({ authenticated: true, failed: '', requests: [] as URL[],
  roster: vi.fn() }));
let client: SupabaseClient<AppDatabase>;
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  from: client.from.bind(client),
  rpc: client.rpc.bind(client),
  auth: { getClaims: async () => ({ data: state.authenticated ? { claims: { sub: 'captain' } } : null, error: null }) },
}) }));
vi.mock('../../data/roster', () => ({ fetchRoster: state.roster }));
beforeEach(() => {
  state.authenticated = true; state.failed = ''; state.requests = [];
  state.roster.mockResolvedValue({ players: [{ playerId: 'p', playerToday: '2026-11-13' }, { playerId: 'q', playerToday: '2026-11-15' }] });
  client = createClient<AppDatabase>('https://activity.test', 'key', { auth: { persistSession: false, autoRefreshToken: false }, global: {
    fetch: async input => {
      const url = new URL(String(input)); state.requests.push(url);
      const table = url.pathname.split('/').at(-1);
      if (table === state.failed) return new Response(JSON.stringify({ message: 'Unavailable' }), { status: 403 });
      const rows = table === 'workout_sessions' ? [{ player_id: 'p', training_date: '2026-11-13' }] :
        table === 'programs' ? [{ player_id: 'p', program_days: [{ weekday: 2, is_rest_day: false }, { weekday: 3, is_rest_day: true }] },
          { player_id: 'p', program_days: [{ weekday: 5, is_rest_day: false }] }] :
          table === 'form_checks' || table === 'form_requests' ? [{ player_id: 'q' }] : table === 'team_leaderboard' ? [{ player_id: 'p', tier: 'champion' }] :
            [{ id: 'p', workout_sessions: [{ session_rpe: 8, completed_at: '2026-11-13T15:00:00Z' }] }];
      return new Response(JSON.stringify(rows), { status: 200 });
    },
  } });
});
it('associates bulk workout, schedule, RPE and video data without inventing missing values', async () => {
  expect(await loadActivity('2026-11-14')).toEqual({ activity: {
    p: { dates: ['2026-11-13'], weekdays: [2], rpe: 8, video: false, rank: 'champion' },
    q: { dates: [], weekdays: [], rpe: null, video: true, assessments: 1 },
  } });
  const sessions = state.requests.find(url => url.pathname.endsWith('/workout_sessions'));
  expect(sessions?.searchParams.getAll('training_date')).toEqual(['gte.2026-11-07', 'lte.2026-11-15']);
  expect(state.requests).toHaveLength(6);
  expect(state.requests.find(url => url.pathname.endsWith('/programs'))?.searchParams.get('order')).toBe('updated_at.desc,id.desc');
  const latest = state.requests.find(url => url.pathname.endsWith('/profiles'));
  expect(latest?.searchParams.get('workout_sessions.limit')).toBe('1');
});
it.each(['workout_sessions', 'programs', 'form_checks', 'form_requests', 'profiles', 'team_leaderboard'])('surfaces %s read failures', async table => {
  state.failed = table;
  expect(await loadActivity('2026-11-14')).toEqual({ error: true });
});
it('does not read player data without authenticated claims', async () => {
  state.authenticated = false;
  expect(await loadActivity('2026-11-14')).toEqual({ error: true });
  expect(state.requests).toEqual([]);
});
it('skips all supplementary reads for an empty roster', async () => {
  state.roster.mockResolvedValue({ players: [] });
  expect(await loadActivity('2026-11-14')).toEqual({ activity: {} });
  expect(state.requests).toEqual([]);
});
