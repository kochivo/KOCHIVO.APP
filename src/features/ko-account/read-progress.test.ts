import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { KoActor } from './data/account';
import { executeIntent } from './data/execute';
import { planIntent } from './data/intents';

const now = Date.parse('2026-11-10T12:00:00Z');
const roster = [{ player_id: 'ahmed', full_name: 'Ahmed', last_training_date: '2026-11-02',
  access_until: '2026-11-17', started_on: '2026-10-01' }];
const board = [{ player_id: 'ahmed', tier: 'champion', lifetime: 120, done: 4, planned: 8,
  adherence: 50, is_crown: true, position: 1 }];
function fixture(role: KoActor['role'] = 'player', overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    captain_roster: roster, team_leaderboard: board,
    my_points: { lifetime: 120, tier: 'champion', done: 4, planned: 8, adherence: 50,
      month_position: 1, crown_needs_workouts: 0, crown_gap: 0 },
    workout_sessions: [{ training_date: '2026-11-09' }], body_scans: [{ scan_date: '2026-11-01' }],
    points_log: [], exercise_swap_requests: [], ...overrides,
  };
  const queries = new Map<string, ReturnType<typeof query>>();
  function query(table: string) {
    const result = { data: values[table] ?? [], count: table === 'exercise_swap_requests' ? 2 : 6, error: null };
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return q;
  }
  const from = vi.fn((table: string) => { const q = query(table); queries.set(table, q); return q; });
  const rpc = vi.fn(async (name: string) => ({ data: values[name], error: null }));
  const actor = { id: 'self', role, db: { from, rpc } } as unknown as KoActor;
  return { actor, from, rpc, queries };
}
const run = (actor: KoActor, kind: 'my_progress' | 'why_not_counted' | 'team_summary', locale: 'ar' | 'en') =>
  executeIntent(actor, { kind, args: {} }, locale, 'unused', now);

it.each(['ar', 'en'] as const)('reads own progress in %s without a confirmation', async locale => {
  const f = fixture();
  const reply = await run(f.actor, 'my_progress', locale);
  expect(reply.kind).toBe('message');
  for (const text of ['120', '180', '50', '4', '8', '2026']) expect(reply.text).toContain(text);
  expect(reply.text).toContain(locale === 'ar' ? 'بطل' : 'Champion');
  expect(f.rpc).toHaveBeenCalledWith('my_points');
  expect(f.queries.get('workout_sessions')?.eq).toHaveBeenCalledWith('player_id', 'self');
  expect(f.queries.get('workout_sessions')?.gte).toHaveBeenCalledWith('training_date', '2026-11-04');
  expect(f.queries.get('workout_sessions')?.lte).toHaveBeenCalledWith('training_date', '2026-11-10');
});
it('omits missing progress values and distinguishes crown eligibility from the score gap', async () => {
  const f = fixture('player', { my_points: { crown_needs_workouts: 2 }, body_scans: [] });
  const reply = await run(f.actor, 'my_progress', 'en');
  expect(reply.text).toContain('2 more workouts');
  for (const text of ['Lifetime', 'InBody', 'undefined', 'null', 'NaN', 'of 8']) expect(reply.text).not.toContain(text);
  const gap = fixture('player', { my_points: { month_position: 2, crown_needs_workouts: 0, crown_gap: 9 } });
  expect((await run(gap.actor, 'my_progress', 'en')).text).toContain('9');
});
it.each(['ar', 'en'] as const)('explains short, missing-set and counted workouts in %s', async locale => {
  for (const reason of ['short', 'sets', 'none', 'review'] as const) {
    const f = fixture('player', {
      points_log: reason === 'none' ? [] : [{ source_key: 'session', status: 'pending', earned_on: '2026-11-09' }],
      workout_sessions: [{ started_at: '2026-11-09T10:00:00Z',
        completed_at: reason === 'short' ? '2026-11-09T10:10:00Z' : '2026-11-09T11:00:00Z', program_day_id: 'day' }],
      program_exercises: [{ sets: reason === 'sets' ? 20 : 10, rest_seconds: 60 }],
    });
    const reply = await run(f.actor, 'why_not_counted', locale);
    const expected = locale === 'en'
      ? { short: 'too short', sets: 'sets missing', none: 'Every recent workout counted', review: 'coach' }
      : { short: 'قصير', sets: 'مجموعات ناقصة', none: 'كل تمارينك الأخيرة اتحسبت', review: 'الكابتن' };
    expect(reply.text).toContain(expected[reason]);
    expect(f.queries.get('points_log')?.in).toHaveBeenCalledWith('status', ['pending', 'rejected']);
    expect(f.queries.get('points_log')?.gte).toHaveBeenCalledWith('earned_on', '2026-10-28');
    if (reason !== 'none') expect(f.queries.get('set_logs')?.is).toHaveBeenCalledWith('deleted_at', null);
  }
});
it.each(['ar', 'en'] as const)('summarizes a roster player using name or screen context in %s', async locale => {
  for (const named of [true, false]) {
    const f = fixture('captain');
    const reply = await executeIntent(f.actor, { kind: 'player_summary', args: named ? { player: 'Ahmed' } : {} },
      locale, 'unused', now, { id: 'ahmed', name: 'Ahmed' });
    expect(reply.kind).toBe('message');
    for (const text of ['Ahmed', '2026', '50', '4', '8', '2']) expect(reply.text).toContain(text);
    expect(reply.text.split('\n').length).toBeLessThanOrEqual(4);
    expect(f.queries.get('exercise_swap_requests')?.eq).toHaveBeenCalledWith('captain_id', 'self');
  }
});
it('refuses a named outsider even with a valid context and rejects foreign context', async () => {
  const f = fixture('captain');
  for (const args of [{ player: 'Outsider' }, {}]) {
    const reply = await executeIntent(f.actor, { kind: 'player_summary', args }, 'en', 'unused', now,
      { id: 'outsider', name: 'Outsider' });
    expect(reply.text).toContain('roster');
  }
  expect(f.from).not.toHaveBeenCalled();
});
it.each(['ar', 'en'] as const)('summarizes the full team in %s and handles an empty roster', async locale => {
  const f = fixture('captain', { team_leaderboard: [...board, { player_id: 'zero', done: 0 }],
    captain_roster: [...roster, { player_id: 'zero', full_name: 'Zero', last_training_date: null, started_on: '2026-11-01' }] });
  const reply = await run(f.actor, 'team_summary', locale);
  for (const text of ['Ahmed', 'Zero', '50']) expect(reply.text).toContain(text);
  expect(reply.text.split('\n')).toHaveLength(4);
  expect((await run(fixture('captain', { captain_roster: [], team_leaderboard: [] }).actor, 'team_summary', locale)).text)
    .toContain(locale === 'ar' ? 'مفيش' : 'No');
});
it('omits missing captain metrics instead of inventing zeroes', async () => {
  const f = fixture('captain', { captain_roster: [{ player_id: 'ahmed', full_name: 'Ahmed' }], team_leaderboard: [] });
  const reply = await executeIntent(f.actor, { kind: 'player_summary', args: { player: 'Ahmed' } }, 'en', 'unused', now);
  expect(reply.text).not.toMatch(/adherence|workouts this month|subscription|rank/i);
});
it.each(['pending', 'rejected'])('keeps the recorded %s decision when current sets meet the threshold', async status => {
  const f = fixture('player', {
    points_log: [{ source_key: 'session', status, earned_on: '2026-11-09' }],
    workout_sessions: [{ started_at: '2026-11-09T10:00:00Z', completed_at: '2026-11-09T10:20:00Z', program_day_id: 'day' }],
    program_exercises: [{ sets: 10, rest_seconds: 60 }],
  });
  const reply = await run(f.actor, 'why_not_counted', 'en');
  expect(reply.text).toContain(status === 'pending' ? 'awaiting coach review' : 'coach rejected');
  expect(reply.text).not.toMatch(/too short|sets missing/);
  expect(f.queries.get('set_logs')?.eq).toHaveBeenCalledWith('player_id', 'self');
  expect(f.queries.get('workout_sessions')?.eq).toHaveBeenCalledWith('player_id', 'self');
});
it('uses half of planned duration above the floor and rounds the required sets up', async () => {
  const f = fixture('player', {
    points_log: [{ source_key: 'session', status: 'pending', earned_on: '2026-11-09' }],
    workout_sessions: [{ started_at: '2026-11-09T10:00:00Z', completed_at: '2026-11-09T10:30:00Z', program_day_id: 'day' }],
    program_exercises: [{ sets: 11, rest_seconds: 360 }],
  });
  const reply = await run(f.actor, 'why_not_counted', 'en');
  expect(reply.text).toContain('37 minutes');
  expect(reply.text).toContain('6 logged, at least 7 required');
});
it('does not guess a reason when the session is unavailable', async () => {
  const f = fixture('player', { points_log: [{ source_key: 'gone', status: 'rejected' }], workout_sessions: [] });
  expect((await run(f.actor, 'why_not_counted', 'en')).text).toContain('available data');
});
it('does not invent crown or zero-workout facts when leaderboard data is unavailable', async () => {
  const f = fixture('captain', { team_leaderboard: null });
  const reply = await run(f.actor, 'team_summary', 'en');
  expect(reply.text).not.toMatch(/crown|Zero counted/);
});
it('rejects cross-role reads before touching the database', async () => {
  const p = fixture(); const c = fixture('captain');
  await run(p.actor, 'team_summary', 'en');
  await executeIntent(p.actor, { kind: 'player_summary', args: { player: 'Ahmed' } }, 'en', 'unused', now);
  await run(c.actor, 'my_progress', 'en'); await run(c.actor, 'why_not_counted', 'en');
  for (const f of [p, c]) { expect(f.rpc).not.toHaveBeenCalled(); expect(f.from).not.toHaveBeenCalled(); }
});
it.each(['player', 'captain'] as const)('offers only role-appropriate read tools to %s', async role => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ candidates: [] }));
  await planIntent(role, { text: 'progress' }, 'key', new AbortController().signal, undefined, [], fetcher);
  const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
    tools: { functionDeclarations: { name: string; description: string }[] }[] };
  const names = body.tools.flatMap(t => t.functionDeclarations.map(d => d.name));
  const permitted = role === 'player' ? ['my_progress', 'why_not_counted'] : ['player_summary', 'team_summary'];
  const denied = role === 'player' ? ['player_summary', 'team_summary'] : ['my_progress', 'why_not_counted'];
  for (const name of permitted) expect(names).toContain(name);
  for (const name of denied) expect(names).not.toContain(name);
  const declaration = (name: string) => body.tools.flatMap(t => t.functionDeclarations).find(d => d.name === name);
  if (role === 'player') {
    expect(declaration('swap_exercise')).toMatchObject({ parameters: { properties: {
      reason: { type: 'STRING', enum: ['injury', 'busy', 'discomfort'], description: expect.any(String) },
      injury: { type: 'STRING', enum: ['knee', 'shoulder', 'lower_back'], description: expect.stringContaining('lower_back') },
    } } });
  } else {
    expect(declaration('create_training')).toMatchObject({ parameters: { properties: {
      days: { items: { properties: { weekday: { type: 'INTEGER', minimum: 0, maximum: 6 } } } },
    } } });
  }
});
