import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
import { CaptainRow } from './components/captain-row';
import type { AppDatabase } from '@/types/app-database';

const state = vi.hoisted(() => ({ load: undefined as (() => Promise<unknown>) | undefined,
  notes: [] as { id: string; createdAt: string; durationSeconds: number; listenedAt: string | null }[] }));
vi.mock('@/core/resource', () => ({ useResource: (_key: string, load: () => Promise<unknown>) => {
  state.load = load; return { status: 'loading', data: undefined };
} }));
vi.mock('@/features/voice-notes', () => ({ listVoiceNotes: async () => state.notes, loadCaptainThreadReplies: async () => [] }));
const requests: URL[] = [];
const client = createClient<AppDatabase>('https://preview.test', 'test', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (input, init) => {
    requests.push(new URL(String(input)));
    return new Response(init?.method === 'HEAD' ? null : JSON.stringify([
      { id: 'm', body: 'Incoming', audio_path: null, duration_seconds: null, created_at: '2026-11-13T08:00:00Z' },
    ]), { status: 200, headers: { 'content-range': '0-0/1' } });
  } },
});
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => client }));
beforeEach(() => { requests.length = 0; state.notes = []; });
async function load() {
  renderToStaticMarkup(createElement(CaptainRow, { playerId: 'p', captainId: 'c' }));
  return state.load?.();
}
it('fetches the latest incoming message independently of outgoing volume and counts all unread', async () => {
  expect(await load()).toMatchObject({ latest: { body: 'Incoming', voice: false }, unread: true });
  const query = requests[0]?.searchParams;
  expect(query?.get('sender_id')).toBe('eq.c');
  expect(query?.get('player_id')).toBe('eq.p');
  expect(query?.get('captain_id')).toBe('eq.c');
  expect(query?.get('limit')).toBe('1');
  expect(requests[1]?.searchParams.get('read_at')).toBe('is.null');
});
it('compares legacy voice notes to chat timestamps rather than always preferring chat', async () => {
  state.notes = [{ id: 'v', createdAt: '2026-11-13T09:00:00Z', durationSeconds: 24, listenedAt: null }];
  expect(await load()).toMatchObject({ latest: { id: 'v', voice: true, durationSeconds: 24 }, unread: true });
});
