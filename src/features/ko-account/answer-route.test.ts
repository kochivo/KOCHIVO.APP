import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as entry from '@/features/ko-entry/server';
import * as ai from '@/features/ai-tools/server';
import * as account from './data/account';
import type { KoActor } from './data/account';
import * as facts from './data/facts';
import * as progress from './data/read-progress';
import { chatReply } from './data/reply';
import { postKoAccountChat } from './data/route';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));

beforeEach(() => vi.stubEnv('KO_ANSWER', ''));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const pack = '[workout_today] rest day\n[workout_tomorrow] no program\n[progress] lifetime points 28';

function setup(status: number, calls: { name: string; args: object }[] = [], pending = false, role: KoActor['role'] = 'player') {
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'ko_rate_take' ? true : name === 'ko_usage_tier' ? [{ captain_id: 'captain', tier: 'entry' }]
      : name === 'my_captain_id' ? 'captain' : 'ok',
    error: null,
  }));
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T12:00:00Z'));
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query),
    limit: async () => ({ data: pending ? [{ id: 'required-form' }] : [], error: null }),
  };
  const from = vi.fn(() => query);
  vi.spyOn(account, 'getKoActor').mockResolvedValue({ id: 'pilot', role, db: { rpc, from } } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set(['pilot']), secret: 's'.repeat(32), key: 'key',
  });
  const load = vi.spyOn(facts, 'loadFacts').mockResolvedValue(pack);
  const fetcher = vi.fn<typeof fetch>(async () => status === 200 ? Response.json({
    candidates: [{ content: { parts: calls.map(functionCall => ({ functionCall })) } }],
  }) : new Response(null, { status }));
  vi.stubGlobal('fetch', fetcher);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return { rpc, load, fetcher, warn, from, query };
}

function post(text: string) {
  const body = new FormData();
  body.set('locale', 'en');
  body.set('text', text);
  return postKoAccountChat(new Request('https://ko.test/api/ko', {
    method: 'POST', body, headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
  }));
}

it('points to the required start form before reading the workout or facts', async () => {
  const { from, query, load } = setup(200, [{ name: 'my_workout', args: { day: 'today' } }], true);
  const workout = vi.spyOn(ai, 'playerWorkout');
  expect(await (await post('What is my workout today?')).json()).toEqual({
    kind: 'message', text: 'Complete the required start form on the Assessments page first.',
  });
  expect(from.mock.calls).toEqual([['form_requests']]);
  expect(query.eq.mock.calls).toEqual([['player_id', 'pilot'], ['captain_id', 'captain'], ['blocks_access', true]]);
  expect(query.is).toHaveBeenCalledWith('answered_at', null);
  expect(load).not.toHaveBeenCalled();
  expect(workout).not.toHaveBeenCalled();
});

it.each([429, 503, 500])('handles Gemini HTTP %s after taking usage first', async status => {
  const { fetcher, rpc, warn } = setup(status);
  const response = await post('Help');
  expect(response.status).toBe(status === 500 ? 502 : 200);
  expect(await response.json()).toEqual(status === 429 ? {
    kind: 'message', text: 'KO is busy today. Try again in a bit. If it still doesn’t work, try tomorrow morning.',
    quick: ['Today’s workout', 'Today’s meals', 'My progress'],
  } : status === 503 ? { kind: 'message', text: 'KO is busy right now. Try again in a minute.' } : { error: 'failed' });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls.map(([name]) => name)).toContain('ko_usage_take');
  expect(warn.mock.calls).toEqual(status === 500 ? [] : [['KO model busy', status]]);
});

it('returns the grounded model answer and its citations after one Gemini call', async () => {
  const args = { text: 'You have 28 lifetime points.', sources: ['progress'] };
  const { fetcher, load, rpc, warn } = setup(200, [{ name: 'answer', args }]);
  const response = await post('How many points do I have?');
  expect(await response.json()).toEqual({ kind: 'message', ...args });
  expect(load).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls.filter(([name]) => name === 'ko_usage_take')).toHaveLength(1);
  expect(warn).not.toHaveBeenCalled();
  const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  expect(request.systemInstruction.parts[0].text).toContain(pack);
  expect(request.tools[0].functionDeclarations).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'answer' })]));
});

it.each(['captain', 'player'] as const)('uses the %s first name for an identity question', async role => {
  const { load, fetcher } = setup(200, [
    { name: 'answer', args: { text: 'أيوه يا نور. إحنا هنا في كو.', sources: ['me'] } },
  ], false, role);
  load.mockResolvedValue(`[me] name: نور علي; role: ${role}`);
  expect(await (await post('عارفني؟')).json()).toEqual({
    kind: 'message', text: 'أيوه يا نور. إحنا هنا في كو.', sources: ['me'],
  });
  const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  expect(request.systemInstruction.parts[0].text).toContain('call answer with only source me');
  expect(request.systemInstruction.parts[0].text).toContain('[me] name: نور علي');
});

it.each([
  ['captain', 'I can show who\'s falling behind, draft a program, or set up a workout reminder.'],
  ['player', 'I can show your workout, meals, or progress.'],
] as const)('offers %s help when the model answer is rejected', async (role, help) => {
  setup(200, [{ name: 'answer', args: { text: 'Nour.', sources: ['me'] } }], false, role);
  expect(await (await post('Who am I?')).json()).toEqual({
    kind: 'message', text: "I don't have that information. " + help,
  });
});

it.each([
  ['How many points?', [{ name: 'answer', args: { text: 'عندك ٢٨ نقطة.', sources: ['progress'] } }], 'عندك 28 نقطة.'],
  ['Can you change my plan?', [{ name: 'clarify', args: { question: 'تقصد ٣ مجموعات؟' } }], 'تقصد 3 مجموعات؟'],
  ['How am I doing?', [{ name: 'my_progress', args: {} }], 'عملت 4 تمارين.'],
  ['My progress', [], 'عملت 4 تمارين.'],
] as const)('normalizes digits for %s', async (text, calls, expected) => {
  setup(200, [...calls]);
  vi.spyOn(progress, 'readProgress').mockResolvedValue('عملت ۴ تمارين.');
  const body = await (await post(text)).json();
  expect(body.text).toBe(expected);
});

it('normalizes quick and action copy while preserving approval tokens', async () => {
  const action = { id: 'action', title: 'تمرين ٢', detail: '٣ مجموعات', token: 'opaque٢' };
  const response = chatReply({ kind: 'message', text: '', quick: ['تمرين ٤'], actions: [action] });
  expect(await response.json()).toEqual({
    kind: 'message', text: '', quick: ['تمرين 4'], actions: [{ ...action, title: 'تمرين 2', detail: '3 مجموعات' }],
  });
  expect(await chatReply({ kind: 'confirm', text: 'وجبة ٢', token: action.token }).json()).toEqual({
    kind: 'confirm', text: 'وجبة 2', token: action.token,
  });
});

it.each([
  ['progress', 'You have 999 points.', 'Your progress from the database.', 'number'],
  ['workout_today', 'You have 42 reps.', 'Today is a rest day. Rest and drink plenty of water.', 'number'],
  ['workout_tomorrow', 'You have ٧٣ reps tomorrow.', 'Tomorrow is a rest day. Rest and drink plenty of water.', 'number'],
  ['progress', 'A'.repeat(701), 'Your progress from the database.', 'length'],
])('falls back from %s on a rejected model answer', async (source, text, expected, reason) => {
  const { fetcher, warn } = setup(200, [{ name: 'answer', args: { text, sources: [source, 'progress'] } }]);
  vi.spyOn(progress, 'readProgress').mockResolvedValue('Your progress from the database.');
  const workout = vi.spyOn(ai, 'playerWorkout').mockResolvedValue({ day: undefined, rest: true });
  const response = await post('What should I know?');
  expect(await response.json()).toEqual({ kind: 'message', text: expected });
  if (source === 'workout_tomorrow') expect(workout).toHaveBeenCalledWith(expect.anything(), '2026-11-20');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls).toEqual([['KO answer guard', reason]]);
});

it('skips facts and removes the answer tool when disabled', async () => {
  vi.stubEnv('KO_ANSWER', '0');
  const { load, fetcher } = setup(200, [{ name: 'my_progress', args: {} }]);
  vi.spyOn(progress, 'readProgress').mockResolvedValue('Progress template');
  expect(await (await post('How am I doing?')).json()).toEqual({ kind: 'message', text: 'Progress template' });
  expect(load).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const request = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  expect(request.systemInstruction.parts[0].text).not.toContain('Facts about this user');
  expect(request.tools[0].functionDeclarations).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'answer' })]));
});
