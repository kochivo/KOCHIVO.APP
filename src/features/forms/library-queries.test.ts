import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { loadLibrary } from './data/library';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));

it.each([1, 20])('loads %i forms with three reads and preserves questions and metrics', async count => {
  const urls: URL[] = [];
  const forms = Array.from({ length: count }, (_, i) => ({ id: `f${i}`, captain_id: 'captain', title: `Form ${i}`,
    kind: 'custom', schedule: null, remind_after_hours: null }));
  const questions = forms.map(form => ({ id: `q${form.id}`, form_id: form.id, position: 0,
    label_ar: 'سؤال', label_en: 'Question', type: 'text', required: false, options: [], maps_to: null, alert_on: null }));
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async input => {
    const url = new URL(String(input));
    urls.push(url);
    if (url.pathname.endsWith('/forms')) return Response.json(forms);
    if (url.pathname.endsWith('/form_questions')) {
      expect(url.searchParams.get('retired_at')).toBe('is.null');
      expect(url.searchParams.get('form_id')).toBe(`in.(${forms.map(form => form.id).join(',')})`);
      return Response.json(questions);
    }
    expect(url.pathname).toBe('/rest/v1/form_requests');
    expect(url.searchParams.get('captain_id')).toBe('eq.captain');
    expect(url.searchParams.getAll('sent_at')).toEqual(['gte.2026-10-31T22:00:00.000Z', 'lt.2026-11-30T22:00:00.000Z']);
    return Response.json([{ form_id: 'f0', player_id: 'p', sent_at: '2026-11-01T00:00Z', answered_at: '2026-11-01T02:00Z' }]);
  } } });
  const result = await loadLibrary(client, 'captain', new Date('2026-11-16T00:00Z'));
  expect(urls).toHaveLength(3);
  expect(result.forms).toHaveLength(count);
  expect(result.forms.every(form => form.questions.length === 1 && form.questions[0]?.form_id === form.id)).toBe(true);
  expect(result.metrics).toEqual({ active: count, sent: 1, answered: 1, recipients: 1, averageHours: 2 });
  expect(result.byForm.f0).toEqual({ active: 0, sent: 1, answered: 1, recipients: 1, averageHours: 2 });
});
