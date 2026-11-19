import { afterEach, expect, it, vi } from 'vitest';
import * as ai from '@/features/ai-tools/server';
import * as entry from '@/features/ko-entry/server';
import * as preview from '@/features/player-preview/server';
import type { AccountReply } from '@/features/ko-core';
import * as account from './data/account';
import type { KoActor } from './data/account';
import { approvalLifetimeMs, issueApproval, verifyApproval } from './data/approval';
import type { Approval } from './data/approval';
import { postKoAccountChat } from './data/route';
import * as progress from './data/read-progress';
import * as executor from './data/execute';
import * as meal from './data/log-meal';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getArabicStyle: async () => undefined }));

const actorId = '22222222-2222-4222-8222-222222222222';
const playerId = '11111111-1111-4111-8111-111111111111';
const approvalId = '33333333-3333-4333-8333-333333333333';
const now = 1_800_000_000_000;
const secret = 's'.repeat(32);

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(role: KoActor['role'], usage = 'ok', credit = true) {
  let warned = false;
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'ko_rate_take' ? true : name === 'ko_apply_action' ? { sent: true }
      : name === 'ko_usage_tier' ? [{ captain_id: actorId, tier: 'entry' }]
      : name === 'ko_usage_take' ? usage
      : name === 'my_captain_id' ? null
      : name === 'ko_usage_claim_warning' ? !warned && (warned = true)
      : name === 'ko_usage_summary' ? [{ credits_used: credit ? 0 : 10, credits_cap: 10, month: '2027-01-01' }]
      : name === 'ko_credit_take' ? credit
      : [{ player_id: playerId, full_name: 'Youssef' }],
    error: null,
  }));
  const query = {
    select: () => query, eq: () => query, is: () => query, abortSignal: () => query,
    maybeSingle: async () => ({
      data: { access_until: '2027-01-28', sessions_left: null, frozen_at: null, pending: false }, error: null,
    }),
  };
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.spyOn(account, 'getKoActor').mockResolvedValue({ id: actorId, role, db: { rpc, from: () => query } } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set([actorId]), secret, key: 'key',
  });
  return rpc;
}

function mockCalls(calls: { name: string; args: object }[]) {
  vi.stubGlobal('fetch', async () => Response.json({
    candidates: [{ content: { parts: calls.map(functionCall => ({ functionCall })) } }],
  }));
}

function post(fields: Record<string, string>) {
  const body = new FormData();
  body.set('locale', 'en');
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return postKoAccountChat(new Request('https://ko.test/api/ko', {
    method: 'POST', body, headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
  }));
}

it.each([true, false])('returns two signed actions with read text present: %s', async read => {
  const rpc = setup('captain');
  vi.spyOn(progress, 'readProgress').mockResolvedValue('Youssef last trained yesterday.');
  mockCalls([
    { name: 'renew_subscription', args: { player: 'Youssef', days: 30 } },
    ...(read ? [{ name: 'player_summary', args: { player: 'Youssef' } }] : []),
    { name: 'send_reminder', args: { player: 'Youssef' } },
  ]);
  const response = await post({ text: 'Renew Youssef for 30 days and send a reminder. When did he last train?' });
  const result = await response.json() as AccountReply;
  expect(result).toMatchObject({
    kind: 'message', text: read ? 'Youssef last trained yesterday.' : 'I’ve prepared your requests. Confirm each one separately.',
    actions: [{ title: 'Renew Youssef’s subscription for 30 days' }, { title: 'Remind Youssef to train today' }],
  });
  const actions = result.kind === 'message' ? result.actions ?? [] : [];
  expect(new Set(actions.map(action => action.id)).size).toBe(2);
  expect(actions.map(action => verifyApproval(action.token, actorId, now, secret)))
    .toEqual(actions.map((action, index) => expect.objectContaining({ id: action.id, player: playerId, kind: index === 0 ? 'renew' : 'reminder' })));
  expect(rpc).not.toHaveBeenCalledWith('ko_apply_action', expect.anything());
});

const mealPayload = { mealId: playerId, name: 'Lunch', eaten: true };
function tokenFor(kind: Approval['kind'], overrides: Partial<Approval> = {}) {
  return issueApproval({
    id: approvalId, actor: actorId, player: kind === 'meal_log' ? actorId : playerId,
    kind, expires: now + 60_000, label: 'Youssef', payload: kind === 'meal_log' ? mealPayload : {},
    ...overrides,
  }, secret);
}

it('applies a captain approval with only the confirm flag and token', async () => {
  const rpc = setup('captain');
  const token = tokenFor('reminder');
  const response = await post({ confirm: '1', token });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ kind: 'message', text: 'Workout reminder queued.' });
  expect(rpc).toHaveBeenCalledWith('ko_apply_action', { p_token: token });
  expect(rpc).not.toHaveBeenCalledWith('ko_credit_take', expect.anything());
});

it.each([true, false])('takes a big action credit before committing when available: %s', async credit => {
  const rpc = setup('captain', 'ok', credit);
  const token = tokenFor('training');
  const response = await post({ confirm: '1', token });
  expect(response.status).toBe(credit ? 200 : 409);
  expect(rpc).toHaveBeenCalledWith('ko_credit_take', { p_month: '2027-01-01', p_cap: 10, p_token: token });
  const names = rpc.mock.calls.map(([name]) => name);
  expect(names.filter(name => name === 'ko_credit_take')).toHaveLength(1);
  if (credit) expect(names.indexOf('ko_apply_action')).toBeGreaterThan(names.indexOf('ko_credit_take'));
  else {
    expect(names).not.toContain('ko_apply_action');
    expect(await response.json()).toMatchObject({ kind: 'message', upgrade: { tier: 'champion', credits: 100 } });
  }
});

it('returns quick buttons at the daily cap without calling Gemini', async () => {
  setup('player', 'daily');
  const fetcher = vi.fn(async () => Response.json({}));
  vi.stubGlobal('fetch', fetcher);
  expect(await (await post({ text: 'Help' })).json()).toMatchObject({
    kind: 'message', text: expect.stringContaining('message limit'),
    quick: ['Today’s workout', 'Today’s meals', 'My progress'],
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it('warns once per captain and month when the shared cap blocks the reply', async () => {
  setup('captain', 'monthly');
  const fetcher = vi.fn(async () => Response.json({}));
  vi.stubGlobal('fetch', fetcher);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const one = await (await post({ text: 'Help' })).json();
  const two = await (await post({ text: 'Help' })).json();
  expect(one).toMatchObject({ kind: 'message', quick: expect.arrayContaining(['My progress']) });
  expect(two).toEqual(one);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([true, false])('shows the cost or upgrade without charging for a big-action preview: %s', async credit => {
  const rpc = setup('captain', 'ok', credit);
  mockCalls([{ name: 'create_training', args: { title: 'New workout', player: 'Youssef', days: 3 } }]);
  const execute = vi.spyOn(executor, 'executeIntent').mockResolvedValue({
    kind: 'message', text: '', actions: [{ id: 'id', title: 'Workout', detail: 'Preview', token: 'token' }],
  });
  const response = await post({ text: 'Create a 3 day program for Youssef' });
  const result = await response.json();
  expect(response.status).toBe(200);
  if (credit) expect(result).toMatchObject({ actions: [{ detail: 'Preview\nThis uses 1 big-action credit.' }] });
  else {
    expect(result).toMatchObject({ upgrade: { tier: 'champion', credits: 100 } });
    expect(result).not.toHaveProperty('actions');
    expect(execute).not.toHaveBeenCalled();
  }
  expect(rpc.mock.calls.map(([name]) => name)).not.toContain('ko_credit_take');
});

it.each(['Today’s workout', 'Today’s meals', 'My progress'])('answers %s without taking quota or calling Gemini', async text => {
  const rpc = setup('player');
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  vi.spyOn(ai, 'playerNutritionPlan').mockResolvedValue(null);
  vi.spyOn(ai, 'playerWorkout').mockResolvedValue(null);
  vi.spyOn(progress, 'readProgress').mockResolvedValue('Your progress');
  expect(await (await post({ text })).json()).toMatchObject({ kind: 'message', text: expect.any(String) });
  expect(rpc.mock.calls.map(([name]) => name)).toEqual(text === 'My progress'
    ? ['ko_rate_take'] : ['ko_rate_take', 'my_captain_id']);
  expect(fetcher).not.toHaveBeenCalled();
});

it('reads the selected roster player’s workout for a captain shortcut', async () => {
  const rpc = setup('captain');
  const read = vi.spyOn(preview, 'fetchPlayerPreview').mockResolvedValue({ data: null });
  const response = await post({ text: 'Today’s workout', context: JSON.stringify({ screen: 'player', playerId }) });
  expect(await response.json()).toEqual({ kind: 'message', text: 'No workout scheduled today.', feedbackIntent: 'quick' });
  expect(read).toHaveBeenCalledWith(playerId, '2027-01-15');
  expect(rpc.mock.calls.map(([name]) => name)).toEqual(['ko_rate_take', 'captain_roster']);
});

it('confirms a player meal through the KO tool client', async () => {
  const rpc = setup('player');
  const run = vi.spyOn(ai, 'runTool').mockResolvedValue({ ok: true, data: {} });
  const response = await post({ confirm: '1', token: tokenFor('meal_log') });
  expect(await response.json()).toEqual({ kind: 'message', text: 'Marked Lunch as eaten.' });
  expect(run).toHaveBeenCalledWith(expect.objectContaining({ client: 'ko', actor: expect.objectContaining({ id: actorId }) }),
    'log_my_meal', { mealId: playerId, eaten: true });
  expect(rpc).not.toHaveBeenCalledWith('ko_apply_action', expect.anything());
});

it('keeps the reviewed local meal date across midnight', async () => {
  setup('player');
  const reviewedAt = Date.parse('2026-11-19T21:59:00Z');
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T22:01:00Z'));
  const run = vi.spyOn(ai, 'runTool').mockResolvedValue({ ok: true, data: {} });
  const response = await post({ confirm: '1', token: tokenFor('meal_log', { expires: reviewedAt + approvalLifetimeMs }) });
  expect(response.status).toBe(200);
  expect(run).toHaveBeenCalledWith(expect.objectContaining({ now: new Date(reviewedAt), timezone: 'Africa/Cairo' }),
    'log_my_meal', { mealId: playerId, eaten: true });
});

it('applies a double-tapped meal approval once and returns the Arabic expiry reply', async () => {
  setup('player');
  const token = tokenFor('meal_log');
  const apply = vi.fn();
  const consumed = new Set<string>();
  vi.spyOn(meal, 'confirmMealApproval').mockImplementation((_actor, approval) => async () => {
    expect(approval).toBe(token);
    if (consumed.has(approval)) return { data: false, error: null };
    consumed.add(approval);
    apply();
    return { data: true, error: null };
  });
  vi.spyOn(ai, 'runTool').mockImplementation(async ({ confirmMeal, signal }) => {
    const result = await confirmMeal?.({ p_meal_id: playerId, p_log_date: '2027-01-15',
      p_swaps: {}, p_eaten: true, p_eaten_macros: null }, signal);
    return { ok: true, data: result?.data === false ? { replayed: true } : {} };
  });
  const [first, second] = await Promise.all([
    post({ confirm: '1', token, locale: 'ar' }),
    post({ confirm: '1', token, locale: 'ar' }),
  ]);
  const responses = [first, second];
  expect(responses.map(response => response.status).sort()).toEqual([200, 410]);
  expect(await responses.find(response => response.status === 410)?.json())
    .toMatchObject({ text: expect.stringContaining('انتهت') });
  expect(apply).toHaveBeenCalledOnce();
});

it.each([
  ['player', 'meal_log', { actor: playerId }],
  ['player', 'meal_log', { expires: now - 1 }],
  ['captain', 'meal_log', {}],
  ['player', 'reminder', {}],
] as const)('rejects %s confirmation for %s with scope or expiry mismatch', async (role, kind, overrides) => {
  const rpc = setup(role);
  const run = vi.spyOn(ai, 'runTool');
  const response = await post({ confirm: '1', token: tokenFor(kind, overrides) });
  expect(response.status).toBe(410);
  expect(await response.json()).toMatchObject({ kind: 'message', text: expect.stringContaining('expired') });
  expect(run).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith('ko_apply_action', expect.anything());
});

it.each([
  ['الغدا', true, 'الغدا'],
  ['Lunch', false, 'Lunch'],
  ['Breakfast', true, null],
  ['Dinner', true, null],
] as const)('previews a meal only for a unique match on %s', async (meal, eaten, name) => {
  setup('player');
  vi.spyOn(ai, 'playerNutritionPlan').mockResolvedValue({
    id: 'active', player_id: actorId, plan_id: approvalId, title: 'Plan', water_target_ml: null,
    targets: { kcal: null, protein: null, carbs: null, fat: null },
    meals: ['الغدا', 'Lunch', 'Early Dinner', 'Late Dinner'].map((name, position) => ({
      id: playerId, name, position, day_type: 'all', time_of_day: null, items: [],
    })),
  });
  vi.spyOn(ai, 'playerMealLogs').mockResolvedValue([]);
  vi.spyOn(ai, 'playerWorkout').mockResolvedValue(null);
  mockCalls([{ name: 'log_meal', args: { meal, eaten } }]);
  const response = await post({ text: meal });
  const result = await response.json() as AccountReply;
  if (name === null) {
    expect(result).toEqual({ kind: 'message', text: 'Which meal? Your meals are: الغدا, Lunch, Early Dinner, Late Dinner.' });
  } else {
    const action = result.kind === 'message' ? result.actions?.[0] : undefined;
    expect(action?.title).toBe(eaten ? `Mark ${name} as eaten` : `Mark ${name} as skipped`);
    expect(verifyApproval(action?.token ?? '', actorId, now, secret)?.payload).toEqual({ mealId: playerId, eaten, name });
  }
});
