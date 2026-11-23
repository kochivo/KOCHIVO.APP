import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { KoActor } from './data/account';
import * as account from './data/account';
import * as entry from '@/features/ko-entry/server';
import * as intents from './data/intents';
import * as facts from './data/facts';
import { postKoAccountChat } from './data/route';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it.each(['allowed', 'limited', 'error', 'throws'] as const)('handles a shared rate RPC that is %s', async mode => {
  vi.stubEnv('KO_ANSWER', '');
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', 'm'.repeat(32));
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
  const rpc = vi.fn(async (name: string, args: unknown) => {
    if (name === 'ko_secret_check') return { data: true, error: null };
    if (name === 'ko_usage_tier') return { data: [{ captain_id: 'pilot', tier: 'entry' }], error: null };
    if (name === 'ko_usage_take') return { data: 'ok', error: null };
    expect(name).toBe('ko_rate_take');
    expect(args).toEqual({ p_limit: 12, p_window_seconds: 60 });
    if (mode === 'throws') throw new Error('Connection failed');
    return { data: mode === 'allowed', error: mode === 'error' ? { message: 'Unavailable' } : null };
  });
  vi.spyOn(account, 'getKoActor').mockResolvedValue({ id: 'pilot', role: 'captain', db: { rpc } } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set(['pilot']), secret: 's'.repeat(32), key: 'key',
  });
  const planner = vi.spyOn(intents, 'planIntent').mockResolvedValue([]);
  const load = vi.spyOn(facts, 'loadFacts').mockResolvedValue('[me] name: Nour; role: captain');
  const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
  const form = new FormData();
  form.set('text', 'Help');
  const response = await postKoAccountChat(new Request('https://ko.test/api/ko', {
    method: 'POST', body: form,
    headers: { origin: 'https://ko.test', host: 'ko.test', 'content-length': '1000' },
  }));
  expect(response.status).toBe(mode === 'allowed' ? 200 : 429);
  if (mode !== 'allowed') expect(await response.json()).toEqual({ error: 'rateLimit' });
  expect(planner).toHaveBeenCalledTimes(mode === 'allowed' ? 1 : 0);
  expect(load).toHaveBeenCalledTimes(mode === 'allowed' ? 1 : 0);
  expect(logger).toHaveBeenCalledTimes(mode === 'error' || mode === 'throws' ? 1 : 0);
});
