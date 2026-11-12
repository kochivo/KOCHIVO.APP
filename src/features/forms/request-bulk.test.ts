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
});
