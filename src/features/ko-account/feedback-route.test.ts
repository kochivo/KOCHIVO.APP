import { afterEach, expect, it, vi } from 'vitest';
import * as entry from '@/features/ko-entry/server';
import * as account from './data/account';
import type { KoActor } from './data/account';
import { postKoLearning } from './data/learning-route';

vi.mock('server-only', () => ({}));
afterEach(() => vi.restoreAllMocks());

it('derives recipient names from the signed-in account and scrubs before calling the RPC', async () => {
  const profile = { select: () => profile, eq: () => profile,
    single: async () => ({ data: { full_name: 'نور علي' }, error: null }) };
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'captain_roster' ? [{ full_name: 'أحمد سامي' }] : true,
    error: null,
  }));
  vi.spyOn(account, 'getKoActor').mockResolvedValue({
    id: 'pilot', role: 'captain', db: { from: () => profile, rpc },
  } as unknown as KoActor);
  vi.spyOn(entry, 'koAccountConfig').mockReturnValue({
    origin: new URL('https://ko.test'), pilots: new Set(['pilot']), secret: 'secret', key: 'key',
  });
  const id = '00000000-0000-7000-8000-000000000100';
  const body = JSON.stringify({ operation: 'feedback', feedback: {
    id, helpful: false, reason: 'wrong', intent: 'answer', sources: ['me', 'progress'],
    question: 'نور: هل أحمد اتمرن؟ ٠١٠١٢٣٤٥٦٧٨', answer: 'أحمد سامي اتمرن. a@b.co',
  } });
  const response = await postKoLearning(new Request('https://ko.test/api/ko/learning', {
    method: 'POST', body, headers: {
      origin: 'https://ko.test', host: 'ko.test', 'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
    },
  }));
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('ko_feedback_submit', {
    p_id: id, p_helpful: false, p_reason: 'wrong', p_intent: 'answer', p_sources: ['progress'],
    p_question: 'انا: هل لاعب اتمرن؟', p_answer: 'لاعب اتمرن.',
  });
});
