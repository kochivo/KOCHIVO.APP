import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as entry from '@/features/ko-entry/server';
import * as ai from '@/features/ai-tools/server';
import * as account from './data/account';
import type { KoActor } from './data/account';
import * as facts from './data/facts';
import * as progress from './data/read-progress';
import { postKoAccountChat } from './data/route';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));

beforeEach(() => vi.stubEnv('KO_ANSWER', ''));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const pack = '[workout_today] rest day\n[workout_tomorrow] no program\n[progress] lifetime points 28';

function setup(status: number, calls: { name: string; args: object }[] = []) {
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'ko_rate_take' ? true : name === 'ko_usage_tier' ? [{ captain_id: 'captain', tier: 'entry' }] : 'ok',
    error: null,
  }));
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T12:00:00Z'));
  vi.spyOn(account, 'getKoActor').mockResolvedValue({ id: 'pilot', role: 'player', db: { rpc } } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set(['pilot']), secret: 's'.repeat(32), key: 'key',
  });
  const load = vi.spyOn(facts, 'loadFacts').mockResolvedValue(pack);
  const fetcher = vi.fn<typeof fetch>(async () => status === 200 ? Response.json({
    candidates: [{ content: { parts: calls.map(functionCall => ({ functionCall })) } }],
  }) : new Response(null, { status }));
  vi.stubGlobal('fetch', fetcher);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  return { rpc, load, fetcher, warn };
}

function post(text: string) {
  const body = new FormData();
  body.set('locale', 'en');
  body.set('text', text);
  return postKoAccountChat(new Request('https://ko.test/api/ko', {
    method: 'POST', body, headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
  }));
}

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
