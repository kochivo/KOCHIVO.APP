import { afterEach, expect, it, vi } from 'vitest';
import { listTools, runTool } from './server';
import type { ToolContext } from './index';

vi.mock('server-only', () => ({}));

const self = '0925f480-36ab-41cf-a472-82bcaf8df781';
const other = '2bf308bd-179d-471e-93de-870f84b7e451';
const correlationId = 'd0f3f525-12cc-4cf5-b3d4-971d82b8ba4b';

function fixture(role: ToolContext['actor']['role'] = 'captain') {
  const rate = vi.fn<() => Promise<unknown>>().mockResolvedValue({ data: true });
  const roster = vi.fn<() => Promise<unknown>>().mockResolvedValue({ data: [] });
  const audit = vi.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue({ error: null });
  const rpc = vi.fn((name: string, args?: unknown) => {
    if (name === 'ai_audit_write') return audit(args);
    const request = (name === 'ko_rate_take' ? rate : roster)();
    return Object.assign(request, { abortSignal: vi.fn<(signal: AbortSignal) => typeof request>(() => request) });
  });
  const controller = new AbortController();
  const ctx: ToolContext = {
    actor: { id: self, role, db: { rpc } as unknown as ToolContext['actor']['db'] },
    client: 'ko', correlationId, now: new Date('2026-11-18T23:00:00Z'),
    timezone: 'Africa/Cairo', signal: controller.signal,
  };
  return { ctx, rpc, rate, roster, audit, controller };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  ['captain', 'unknown', {}, 'not_found'],
  ['player', 'list_athletes', {}, 'forbidden'],
  ['captain', 'get_athlete_details', { athleteId: 'private value' }, 'invalid_input'],
] as const)('checks %s calls to %s before rate limiting', async (role, name, args, code) => {
  const { ctx, rate, audit } = fixture(role);
  const result = await runTool(ctx, name, args);
  expect(result).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(result)).not.toContain('private value');
  expect(rate).not.toHaveBeenCalled();
  expect(audit).toHaveBeenCalledOnce();
  expect(audit).toHaveBeenCalledWith({
    p_client: 'ko', p_tool: name === 'unknown' ? 'unknown_tool' : name, p_kind: 'read',
    p_status: code, p_duration_ms: expect.any(Number), p_correlation: correlationId,
  });
});

it('returns not_found for an athlete outside the captain roster', async () => {
  const { ctx, rpc } = fixture();
  expect(await runTool(ctx, 'get_athlete_details', { athleteId: other }))
    .toMatchObject({ ok: false, error: { code: 'not_found' } });
  expect(rpc).toHaveBeenCalledWith('captain_roster');
});

it('forbids players from requesting another player’s progress', async () => {
  const { ctx, roster } = fixture('player');
  expect(await runTool(ctx, 'get_athlete_progress', { athleteId: other }))
    .toMatchObject({ ok: false, error: { code: 'forbidden' } });
  expect(roster).not.toHaveBeenCalled();
});

it('returns only the allowed progress fields for the player', async () => {
  const { ctx, roster, rpc } = fixture('player');
  roster.mockResolvedValue({ data: {
    done: 2, planned: 8, adherence: 25, tier: 'beginner', lifetime: 40, logs: ['private'],
  } });
  const scans = Promise.resolve({ data: [{ scan_date: '2026-11-17' }] });
  Object.assign(scans, {
    select: () => scans, eq: () => scans, lte: () => scans, order: () => scans,
    limit: () => scans, abortSignal: () => scans,
  });
  Object.assign(ctx.actor.db, { from: () => scans });
  expect(await runTool(ctx, 'get_athlete_progress', { athleteId: self.toUpperCase() })).toEqual({
    ok: true, data: {
      month: { done: 2, planned: 8, adherence: 25 }, rank: 'beginner', points: 40, lastBodyScan: '2026-11-17',
    },
  });
  expect(rpc).toHaveBeenCalledWith('my_points');
  expect(rpc).not.toHaveBeenCalledWith('captain_roster');
});

it('accepts an uppercase UUID for the same roster athlete', async () => {
  const { ctx, roster } = fixture();
  roster.mockResolvedValue({ data: [{ player_id: other, full_name: 'Athlete' }] });
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query),
    order: vi.fn(() => query), limit: vi.fn(() => query), abortSignal: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: { access_until: '2026-12-01', sessions_left: 2 } }),
  };
  Object.assign(ctx.actor.db, { from: () => query });
  expect(await runTool(ctx, 'get_athlete_details', { athleteId: other.toUpperCase() }))
    .toMatchObject({ ok: true, data: { name: 'Athlete', sessions_left: 2 } });
  expect(query.eq).toHaveBeenCalledWith('player_id', other);
});

it('uses the caller’s local calendar day for expiring subscriptions', async () => {
  const { ctx, roster } = fixture();
  roster.mockResolvedValue({ data: [{ player_id: other, full_name: 'Athlete', access_until: '2026-11-19' }] });
  expect(await runTool(ctx, 'get_expiring_subscriptions', { days: 1 })).toEqual({
    ok: true, data: [{ id: other, name: 'Athlete', accessUntil: '2026-11-19', daysLeft: 0 }],
  });
});

it('times out a stalled tool and audits the timeout', async () => {
  vi.useFakeTimers();
  const { ctx, roster, audit } = fixture();
  roster.mockReturnValue(new Promise(() => {}));
  const result = runTool(ctx, 'list_athletes', {});
  await vi.advanceTimersByTimeAsync(8_000);
  expect(await result).toMatchObject({ ok: false, error: { code: 'timeout' } });
  expect(audit).toHaveBeenCalledWith(expect.objectContaining({ p_status: 'timeout' }));
});

it('cancels a stalled query when the caller aborts', async () => {
  vi.useFakeTimers();
  const { ctx, roster, rpc, controller } = fixture();
  roster.mockReturnValue(new Promise(() => {}));
  const result = runTool(ctx, 'list_athletes', {});
  await vi.advanceTimersByTimeAsync(0);
  expect(roster).toHaveBeenCalledOnce();
  const request = rpc.mock.results.at(-1)?.value;
  const signal = request?.abortSignal.mock.calls[0]?.[0];
  controller.abort(new Error('private reason'));
  expect(signal?.aborted).toBe(true);
  expect(await result).toMatchObject({ ok: false, error: { code: 'unavailable', message: 'Tool unavailable.' } });
});

it('rejects invalid tool output and logs one error without output values', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { ctx, roster } = fixture();
  roster.mockResolvedValue({ data: [{ player_id: other, full_name: 123 }] });
  expect(await runTool(ctx, 'list_athletes', {})).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(error).toHaveBeenCalledOnce();
  expect(JSON.stringify(error.mock.calls)).not.toContain('123');
});

it.each([false, null])('fails closed when the rate RPC returns %s', async data => {
  const { ctx, rpc, rate, roster } = fixture();
  rate.mockResolvedValue({ data });
  expect(await runTool(ctx, 'list_athletes', {})).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
  expect(rpc).toHaveBeenCalledWith('ko_rate_take', { p_limit: 12, p_window_seconds: 60 });
  expect(roster).not.toHaveBeenCalled();
});

it('returns the result when audit writing fails', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { ctx, audit } = fixture();
  audit.mockRejectedValue(new Error('private database error'));
  expect(await runTool(ctx, 'list_athletes', {})).toEqual({ ok: true, data: [] });
  expect(audit).toHaveBeenCalledWith(expect.objectContaining({ p_status: 'ok' }));
  expect(warn).toHaveBeenCalledOnce();
});

it('lists only player tools', () => {
  expect(listTools('player')).toEqual([{
    name: 'get_athlete_progress', description: expect.any(String), kind: 'read',
    inputJsonSchema: expect.objectContaining({
      $schema: 'http://json-schema.org/draft-07/schema#',
      properties: { athleteId: { type: 'string', format: 'uuid', pattern: expect.any(String) } },
    }),
  }, expect.objectContaining({ name: 'get_my_nutrition_today', kind: 'read' }),
  expect.objectContaining({ name: 'get_my_workout_today', kind: 'read' }),
  expect.objectContaining({ name: 'log_my_meal', kind: 'write' })]);
});
