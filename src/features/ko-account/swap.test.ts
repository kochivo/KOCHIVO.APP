import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { swapOptions } from '@/features/program-generator';
import { parseIntent } from './data/intents';
import { chooseSwap, prepareSwap } from './data/swap';
import type { KoActor } from './data/account';
import type * as AccountModule from './data/account';
import type * as IntentsModule from './data/intents';
import { issueApproval, verifyApproval } from './data/approval';
import type { Approval } from './data/approval';
import { postKoAccountChat } from './data/route';
import { executeIntent } from './data/execute';
import { createT } from '@/core/i18n/messages';
import { koPreviewMessages } from '@/features/ko-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { KoFeed } from '../ko-preview/components/ko-feed';
vi.mock('@/features/ko-feed/hooks/use-ko-feed', () => ({ refreshFeed: vi.fn(), useKoFeed: () => ({
  status: 'ready', rows: [{ key: 'swap', kind: 'swap_requested', severity: 'urgent', player_name: 'Player',
    data: { reason: 'discomfort', injury: null, from: { en: 'Bridge' }, to: { en: 'Alternative' } } }],
}) }));
const chat = vi.hoisted(() => ({ actor: null as KoActor | null, pilots: new Set<string>(), plan: vi.fn() }));
vi.mock('./data/account', async original => ({ ...await original<typeof AccountModule>(), getKoActor: async () => chat.actor }));
vi.mock('./data/meal', () => ({ readMeal: async () => [] }));
vi.mock('./data/intents', async original => ({ ...await original<typeof IntentsModule>(), planIntent: chat.plan }));
vi.mock('@/features/ko-entry/server', () => ({ koAccountConfig: () => ({
  origin: new URL('https://kochivo.test'), secret: 'swap-test-secret-12345678901234567890', key: 'test', pilots: chat.pilots,
}) }));
afterEach(() => { vi.restoreAllMocks(); chat.plan.mockReset(); chat.pilots.clear(); });
const candidates = [
  { exercise_id: 'current', pattern: 'hinge', stress: ['lower_back'] },
  { exercise_id: 'unsafe', pattern: 'hinge', stress: ['knee'] },
  { exercise_id: 'other', pattern: 'squat', stress: [] },
  ...['d', 'c', 'b', 'a'].map(exercise_id => ({ exercise_id, pattern: 'hinge', stress: [] })),
];
it('returns at most three distinct safe alternatives in a stable order without changing the input', () => {
  const before = structuredClone(candidates);
  expect(swapOptions('current', ['knee'], [...candidates, candidates[3]] .filter(row => row !== undefined))
    .map(row => row.exercise_id)).toEqual(['a', 'b', 'c']);
  expect(candidates).toEqual(before);
  expect(swapOptions('missing', ['knee'], candidates)).toEqual([]);
  expect(swapOptions('current', ['knee', 'lower_back'], candidates).every(row => row.stress.length === 0)).toBe(true);
});
const player = '00000000-0000-7000-8000-000000000100';
const programExercise = '00000000-0000-7000-8000-000000000101';
const target = '00000000-0000-7000-8000-000000000102';
const payload = { programExercise, injury: 'knee', options: [target] };
it.each(['1', '١'])('sends numeric choice %s through the request RPC without a program write', async text => {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const actor = { id: player, role: 'player', db: { rpc } } as unknown as KoActor;
  expect((await chooseSwap(actor, payload, text, 'en')).text).toContain('sent to your coach');
  expect(rpc).toHaveBeenCalledExactlyOnceWith('request_exercise_swap', {
    p_program_exercise_id: programExercise, p_to_exercise_id: target, p_injury: 'knee',
  });
});
it('rejects malformed choices, out-of-range choices and captains before any request', async () => {
  const rpc = vi.fn();
  const actor = { id: player, role: 'player', db: { rpc } } as unknown as KoActor;
  for (const text of ['0', '2', '4', '1 extra']) await chooseSwap(actor, payload, text, 'ar');
  await chooseSwap({ ...actor, role: 'captain' }, payload, '1', 'en');
  await chooseSwap(actor, { ...payload, injury: 'elbow' }, '1', 'en');
  expect(rpc).not.toHaveBeenCalled();
  await expect(prepareSwap({ ...actor, role: 'captain' }, 'Squat', 'knee', 'en')).resolves.toEqual(expect.objectContaining({ text: expect.any(String) }));
});
function withPlan(names: string[], tags: object[]) {
  const programQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({
    data: { program_days: [{ title: 'Day', program_exercises: names.map(name => ({
      id: programExercise, exercise_id: 'current', exercises: { name_ar: null, name_en: name },
    })) }] }, error: null,
  }) };
  const tagQuery = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: tags, error: null }) };
  const from = vi.fn((table: string) => table === 'programs' ? programQuery : tagQuery);
  return { actor: { id: player, role: 'player', db: { from } } as unknown as KoActor, from, programQuery };
}
it('resolves the exercise only in the active player plan and replies with localized numbered choices', async () => {
  const { actor, programQuery } = withPlan(['Bridge'], [
    { exercise_id: 'current', pattern: 'hinge', stress: [], exercises: { name_ar: null, name_en: 'Bridge' } },
    { exercise_id: target, pattern: 'hinge', stress: [], exercises: { name_ar: 'بديل', name_en: 'Alternative' } },
  ]);
  const result = await prepareSwap(actor, 'Bridge', 'knee', 'ar');
  expect(result.text).toContain('1) بديل');
  expect(result.payload).toEqual({ programExercise, injury: 'knee', options: [target] });
  expect(programQuery.eq).toHaveBeenCalledWith('player_id', player);
  expect(programQuery.eq).toHaveBeenCalledWith('status', 'active');
  expect(programQuery.eq).toHaveBeenCalledWith('is_template', false);
});
it('handles missing, ambiguous and unsafe options without suggesting a change', async () => {
  expect((await prepareSwap(withPlan([], []).actor, 'Bridge', 'knee', 'en')).text).toContain('not in the current plan');
  const ambiguous = withPlan(['Bridge', 'Bridge'], []);
  expect((await prepareSwap(ambiguous.actor, 'Bridge', 'knee', 'en')).text).toContain('More than one exercise');
  expect(ambiguous.from).not.toHaveBeenCalledWith('exercise_generator_tags');
  expect((await prepareSwap(withPlan(['Bridge'], []).actor, 'Bridge', 'knee', 'ar')).text)
    .toBe('مفيش بديل آمن دلوقتي، كلّم الكابتن.');
});
it('parses only explicit injury swap requests in the player tool allowlist', () => {
  expect(parseIntent('swap_exercise', { exercise: 'Squat', injury: 'knee' }, ['swap_exercise']))
    .toEqual({ kind: 'swap_exercise', args: { exercise: 'Squat', reason: 'injury', injury: 'knee' } });
  expect(parseIntent('swap_exercise', { exercise: 'Squat', injury: 'elbow' }, ['swap_exercise'])).toBeNull();
  expect(parseIntent('swap_exercise', { exercise: 'Squat' }, ['swap_exercise'])).toBeNull();
  expect(parseIntent('swap_exercise', { exercise: 'Squat', injury: 'knee' }, ['read_exercise'])).toBeNull();
});
const secret = 'swap-test-secret-12345678901234567890';
const now = 1_800_000_000_000;
const optionsToken = (overrides: Partial<Approval> = {}) => issueApproval({
  actor: player, player, id: target, kind: 'swap_options', label: '', payload,
  expires: now + 600_000, ...overrides,
}, secret);
function chatRequest(text: string, cookie?: string, token?: string) {
  const form = new FormData();
  form.set('locale', 'en'); form.set('text', text);
  if (token) form.set('token', token);
  const request = new Request('https://kochivo.test/api/ko', { method: 'POST', body: form });
  request.headers.set('origin', 'https://kochivo.test'); request.headers.set('host', 'kochivo.test');
  request.headers.set('content-length', '1000');
  if (cookie) request.headers.set('cookie', cookie);
  return request;
}
function authenticated(role: 'player' | 'captain' = 'player') {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  chat.actor = { id: player, role, db: { rpc } } as unknown as KoActor;
  chat.pilots.add(player);
  vi.spyOn(Date, 'now').mockReturnValue(now);
  return rpc;
}
it('reuses HMAC verification with a ten-minute options expiry and actor binding', () => {
  const token = optionsToken();
  expect(verifyApproval(token, player, now, secret)?.kind).toBe('swap_options');
  expect(verifyApproval(token, player, now + 600_001, secret)).toBeNull();
  expect(verifyApproval(token, target, now, secret)).toBeNull();
  expect(verifyApproval(token + '0', player, now, secret)).toBeNull();
});
it('issues the options token from the exercise intent without asking the player to confirm a program write', async () => {
  const { actor } = withPlan(['Bridge'], [
    { exercise_id: 'current', pattern: 'hinge', stress: [], exercises: { name_ar: null, name_en: 'Bridge' } },
    { exercise_id: target, pattern: 'hinge', stress: [], exercises: { name_ar: null, name_en: 'Alternative' } },
  ]);
  const result = await executeIntent(actor, { kind: 'swap_exercise', args: { exercise: 'Bridge', injury: 'knee' } }, 'en', secret, now);
  expect(result.kind).toBe('message');
  expect(result).toHaveProperty('optionsToken');
  if ('optionsToken' in result && typeof result.optionsToken === 'string')
    expect(verifyApproval(result.optionsToken, player, now, secret)).toMatchObject({ kind: 'swap_options', expires: now + 600_000, payload });
});
it('routes a cookie-backed Arabic numeric choice only after signed token verification', async () => {
  const rpc = authenticated();
  const response = await postKoAccountChat(chatRequest('١', `ko_swap_options=${optionsToken()}`));
  expect(await response.json()).toMatchObject({ kind: 'message', text: expect.stringContaining('sent to your coach') });
  expect(rpc).toHaveBeenCalledExactlyOnceWith('request_exercise_swap', {
    p_program_exercise_id: programExercise, p_to_exercise_id: target, p_injury: 'knee',
  });
  expect(chat.plan).not.toHaveBeenCalled();
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});
it.each(['missing', 'expired', 'foreign', 'wrong-player', 'tampered', 'wrong-kind'])(
  'rejects %s options before a request RPC', async failure => {
    const rpc = authenticated();
    const token = failure === 'missing' ? '' : failure === 'expired' ? optionsToken({ expires: now - 1 })
      : failure === 'foreign' ? optionsToken({ actor: target }) : failure === 'wrong-player' ? optionsToken({ player: target })
      : failure === 'wrong-kind' ? optionsToken({ kind: 'renew' })
      : optionsToken() + (failure === 'tampered' ? '0' : '');
    const response = await postKoAccountChat(chatRequest('1', `ko_swap_options=${token}`));
    expect(await response.json()).toMatchObject({ kind: 'message', text: expect.stringContaining('expired') });
    expect(rpc).not.toHaveBeenCalled();
    expect(chat.plan).not.toHaveBeenCalled();
  });
it('keeps numeric requests behind the pilot gate', async () => {
  const rpc = authenticated(); chat.pilots.clear();
  expect((await postKoAccountChat(chatRequest('1', undefined, optionsToken()))).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it('preserves captain numeric intent handling without allowing the player request tool', async () => {
  const rpc = authenticated('captain');
  chat.plan.mockResolvedValue({ kind: 'clarify', args: { question: 'Which exercise?' } });
  const response = await postKoAccountChat(chatRequest('1', `ko_swap_options=${optionsToken()}`));
  expect(await response.json()).toMatchObject({ text: 'Which exercise?' });
  expect(chat.plan).toHaveBeenCalledTimes(1);
  expect(rpc).not.toHaveBeenCalled();
});
it('sets an HttpOnly options cookie from the normal intent path for the existing chat client', async () => {
  const rpc = authenticated();
  const fixture = withPlan(['Bridge'], [
    { exercise_id: 'current', pattern: 'hinge', stress: [], exercises: { name_ar: null, name_en: 'Bridge' } },
    { exercise_id: target, pattern: 'hinge', stress: [], exercises: { name_ar: null, name_en: 'Alternative' } },
  ]);
  chat.actor = { ...fixture.actor, db: { ...fixture.actor.db, rpc } } as unknown as KoActor;
  chat.plan.mockResolvedValue({ kind: 'swap_exercise', args: { exercise: 'Bridge', injury: 'knee' } });
  const response = await postKoAccountChat(chatRequest('My knee hurts doing Bridge'));
  expect(await response.json()).toMatchObject({ kind: 'message', text: expect.stringContaining('Send the number') });
  const cookie = response.headers.get('set-cookie') ?? '';
  for (const flag of ['ko_swap_options=', 'HttpOnly', 'SameSite=Strict', 'Secure', 'Max-Age=600', 'Path=/api/ko']) expect(cookie).toContain(flag);
  const chosen = await postKoAccountChat(chatRequest('1', cookie.split(';')[0]));
  expect(await chosen.json()).toMatchObject({ text: expect.stringContaining('sent to your coach') });
  expect(rpc).toHaveBeenCalledTimes(1);
});
it('clears pending options when using the meal suggestion shortcut', async () => {
  authenticated();
  vi.mocked(Date.now).mockReturnValue(now + 60_001);
  const text = createT(koPreviewMessages, 'en')('suggest.meal');
  const response = await postKoAccountChat(chatRequest(text, `ko_swap_options=${optionsToken()}`));
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  expect(chat.plan).not.toHaveBeenCalled();
});
it('rate-limits numeric choices through the existing shared limiter', async () => {
  const rpc = authenticated();
  vi.mocked(Date.now).mockReturnValue(now + 120_002);
  for (let i = 0; i < 12; i++) expect((await postKoAccountChat(chatRequest('1'))).status).toBe(200);
  expect((await postKoAccountChat(chatRequest('1', undefined, optionsToken()))).status).toBe(429);
  expect(rpc).not.toHaveBeenCalled();
});
it.each(['injury', 'busy', 'discomfort'])('validates %s and requires a body part only for injury', reason => {
  const parse = (injury?: string) => parseIntent('swap_exercise', { exercise: 'Bridge', reason, ...(injury && { injury }) }, ['swap_exercise']);
  expect(Boolean(parse())).toBe(reason !== 'injury');
  expect(parse('knee')?.args).toMatchObject({ reason });
  expect(parse('elbow')).toBeNull();
});
it.each(['ar', 'en'] as const)('renders the discomfort captain reason in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoFeed, { avatar: () => null })));
  expect(html).toContain(locale === 'ar' ? 'مش مرتاح في التمرين' : 'Not comfortable with the exercise');
});
it.each(['ar', 'en'] as const)('lists only different equipment for the same muscle without any busy write in %s', async locale => {
  const tags = [['current', 'gym', 'legs'], ['sameGear', 'gym', 'legs'], ['wrong', 'bodyweight', 'chest'],
    ['a', 'bodyweight', 'legs'], ['b', 'dumbbells', 'legs'], ['c', 'bodyweight', 'legs'], ['d', 'dumbbells', 'legs']]
    .map(([exercise_id, equipment, body_part]) => ({ exercise_id, equipment: 'gym', pattern: 'hinge', stress: [], exercises: { name_en: exercise_id, name_ar: null, body_part, equipment } }));
  const { actor } = withPlan(['Bridge'], [...tags].reverse()); const rpc = vi.fn();
  expect((await prepareSwap(actor, 'Bridge', undefined, locale, 'busy')).text).toContain('3) c');
  const result = await executeIntent({ ...actor, db: { ...actor.db, rpc } } as unknown as KoActor,
    { kind: 'swap_exercise', args: { exercise: 'Bridge', reason: 'busy', injury: 'knee' } }, locale, secret, now);
  expect(result).toEqual({ kind: 'message', text: expect.stringContaining(locale === 'ar' ? 'ده لتمرين النهارده بس، الخطة زي ما هي' : 'Just for today; your plan stays the same') });
  expect(result.text).toContain('1) a'); expect(result.text).toContain('3) c');
  for (const excluded of ['sameGear', 'wrong', '4)', 'Send the number', 'ابعتلي الرقم']) expect(result.text).not.toContain(excluded);
  await chooseSwap({ ...actor, db: { rpc } } as unknown as KoActor, { ...payload, reason: 'busy' }, '1', locale);
  expect(rpc).not.toHaveBeenCalled();
});
it('carries discomfort through signed options to a captain request', async () => {
  const { actor } = withPlan(['Bridge'], ['current', target].map(exercise_id => ({ exercise_id, pattern: 'hinge', stress: [], exercises: { name_en: 'Bridge', name_ar: null } })));
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const result = await executeIntent(actor, { kind: 'swap_exercise', args: { exercise: 'Bridge', reason: 'discomfort' } }, 'en', secret, now);
  expect(result.kind).toBe('message'); expect(result).toHaveProperty('optionsToken');
  if (!('optionsToken' in result) || !result.optionsToken) throw new Error('Missing discomfort options');
  const signed = verifyApproval(result.optionsToken, player, now, secret);
  expect(signed?.payload).toMatchObject({ reason: 'discomfort' });
  await chooseSwap({ ...actor, db: { rpc } } as unknown as KoActor, signed?.payload, '1', 'en');
  expect(rpc).toHaveBeenCalledExactlyOnceWith('request_exercise_swap', { p_program_exercise_id: programExercise, p_to_exercise_id: target, p_injury: null, p_reason: 'discomfort' });
});
it('keeps empty busy advice read-only when equipment metadata is missing', async () => {
  const result = await prepareSwap(withPlan(['Bridge'], [{ exercise_id: 'current', exercises: { body_part: 'legs', equipment: null } }]).actor, 'Bridge', undefined, 'en', 'busy');
  expect(result).toEqual({ text: 'No alternative with different equipment is available. Ask your coach.\nJust for today; your plan stays the same' });
});
