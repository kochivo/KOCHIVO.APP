import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { expect, it, vi } from 'vitest';
import { loadPlayerRequests } from './data/request-load';
vi.mock('server-only', () => ({}));

it('loads a request list with four bulk reads while preserving questions and photo answers', async () => {
  const calls: string[] = [];
  const requests = Array.from({ length: 3 }, (_, i) => ({ id: `r${i}`, form_id: 'f', player_id: 'p', captain_id: 'c',
    sent_at: '2026-11-03T10:00Z', due_at: null, reminded_at: null, answered_at: '2026-11-03T11:00Z',
    reviewed_at: null, captain_reply: null, status: 'answered' }));
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const url = new URL(String(input)), table = url.pathname.split('/').at(-1) ?? '';
    calls.push(table);
    const rows = table === 'form_requests' ? requests : table === 'forms' ? [{ id: 'f', title: 'Weekly' }]
      : table === 'form_questions' ? [{ id: 'q', form_id: 'f', position: 0, label_ar: 'صور', label_en: 'Photos',
        type: 'photos', required: false, options: [], maps_to: null, alert_on: null }]
        : [{ id: 'a', request_id: 'r0', question_id: 'q', value: null, photo_paths: ['private/photo.jpg'] }];
    const single = url.searchParams.get('id')?.startsWith('eq.');
    return Response.json(single ? rows[0] : rows);
  } } });
  const result = await loadPlayerRequests(client, 'p');
  expect(calls).toHaveLength(4);
  expect(result).toHaveLength(3);
  expect(result[0]?.title).toBe('Weekly');
  expect(result[0]?.questions[0]?.type).toBe('photos');
  expect(result[0]?.answers[0]?.photo_paths).toEqual(['private/photo.jpg']);
  expect(result[1]?.answers).toEqual([]);
  expect(result[1]?.questions).toEqual([]);
});

it('loads immutable question snapshots for answered and reviewed requests', async () => {
  const original = { id: 'old', form_id: 'f', position: 0, label_ar: 'Original', label_en: 'Original',
    type: 'text', required: false, options: [], maps_to: null, alert_on: null };
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const table = new URL(String(input)).pathname.split('/').at(-1);
    return Response.json(table === 'form_requests' ? ['answered', 'reviewed'].map(status => ({ id: status, form_id: 'f',
      player_id: 'p', captain_id: 'c', answered_at: '2026-11-16T10:00Z', reviewed_at: status === 'reviewed' ? '2026-11-16T11:00Z' : null,
      question_snapshot: [original], status })) : table === 'forms' ? [{ id: 'f', title: 'Form' }]
      : table === 'form_questions' ? [{ ...original, label_en: 'Edited' }, { ...original, id: 'new', required: true }] : []);
  } } });
  const results = await loadPlayerRequests(client, 'p');
  for (const result of results) expect(result.questions).toMatchObject([{ id: 'old', label_en: 'Original', required: false }]);
  expect(results.every(result => result.questions.length === 1)).toBe(true);
});
