import { createClient } from '@supabase/supabase-js';
import { expect, it } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { listVoiceNotes, loadCaptainThreadReplies } from '@/features/voice-notes';
import { renewMessageAudio } from './data/chat';
import type { ChatMessage } from './types';

it('scopes every legacy source to the conversation captain, preserving unscoped history reads', async () => {
  const requests: URL[] = [];
  const client = createClient<AppDatabase>('https://history.test', 'key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async input => {
      requests.push(new URL(String(input))); return new Response('[]');
    } },
  });
  await listVoiceNotes(client, 'player', 'current');
  await loadCaptainThreadReplies(client, 'player', 'current');
  expect(requests).toHaveLength(4);
  for (const url of requests) {
    expect(url.searchParams.get('player_id')).toBe('eq.player');
    expect(url.searchParams.get('captain_id')).toBe('eq.current');
  }
  requests.length = 0;
  await listVoiceNotes(client, 'player');
  await loadCaptainThreadReplies(client, 'player');
  expect(requests.every(url => !url.searchParams.has('captain_id'))).toBe(true);
});

it('renews expiring cached audio only and preserves message metadata', async () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const signedPaths: string[][] = [];
  const client = createClient<AppDatabase>('https://history.test', 'key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (_input, init) => {
      const { paths } = JSON.parse(String(init?.body)) as { paths: string[] };
      signedPaths.push(paths);
      return new Response(JSON.stringify(paths.map(path => ({ path, signedURL: '/renewed' }))));
    } },
  });
  const old: ChatMessage = { id: 'old', playerId: 'p', captainId: 'c', senderId: 'c', body: null,
    audioPath: 'p/chat/old.webm', durationSeconds: 12, readAt: 'read', createdAt: 'created',
    url: '/expired', urlExpiresAt: now.getTime() + 30_000 };
  const fresh = { ...old, id: 'fresh', urlExpiresAt: now.getTime() + 3600_000 };
  const text = { ...old, id: 'text', audioPath: null };
  const result = await renewMessageAudio(client, [old, fresh, text], now);
  expect(signedPaths).toEqual([['p/chat/old.webm']]);
  expect(result[0]).toMatchObject({ ...old, url: expect.stringContaining('/renewed'), urlExpiresAt: now.getTime() + 3600_000 });
  expect(result[1]).toBe(fresh);
  expect(result[2]).toBe(text);
  expect(old.url).toBe('/expired');
});
