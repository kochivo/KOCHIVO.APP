import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { loadRequest } from './data/request-load';

vi.mock('server-only', () => ({}));
const question = (n: number) => ({ id: `q${n}`, form_id: 'f', position: n, label_ar: 'سؤال', label_en: 'Question',
  type: 'text', required: true, options: [], maps_to: null, alert_on: null });
it.each([false, true])('keeps retired questions beyond the active 100 in request history: answered=%s', async answered => {
  const sent = Array.from({ length: 100 }, (_, n) => question(n));
  const current = [...sent.slice(1), question(100), { ...question(0), position: 100, retired_at: '2026-11-03T10:00:00Z' }];
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/form_requests')) return Response.json({ id: 'r', form_id: 'f',
      answered_at: answered ? '2026-11-03T10:00:00Z' : null, reviewed_at: null, question_snapshot: answered ? null : sent });
    if (url.pathname.endsWith('/forms')) return Response.json({ title: 'Form' });
    if (url.pathname.endsWith('/form_answers')) return Response.json(answered ? [{ id: 'a', question_id: 'q0', value: 'History', photo_paths: [] }] : []);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    return Response.json(current.slice(offset, offset + limit));
  } } });
  const result = await loadRequest(client, 'r');
  expect(result.questions.some(q => q.id === 'q0')).toBe(true);
  expect(result.questions).toHaveLength(answered ? 1 : 100);
});
