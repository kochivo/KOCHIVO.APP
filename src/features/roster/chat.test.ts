import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { AppDatabase } from '@/types/app-database';
import { RosterRow } from './components/roster-row';
import { PlayerRow } from './v6/player-row';
import type { RosterPlayer } from './types';
import { loadRosterChat } from './data/roster-chat';

vi.mock('server-only', () => ({}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
const player: RosterPlayer = { playerId: 'p', fullName: 'أحمد سامي', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-13', programTitle: null, openTasks: 1 };
const render = (chat: RosterPlayer['chat']) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
  createElement(RosterRow, { player: { ...player, chat }, today: '2026-11-13', onArchive: () => undefined })));

it('links a positive unread badge to chat and keeps the task badge distinct', () => {
  const html = render({ unread: 2, body: 'أول سطر\nثاني سطر', voice: false, createdAt: '2026-11-13T07:44:00Z' });
  expect(html).toContain('href="/captain/players/p/chat"');
  expect(html).toContain('aria-label="2 رسايل جديدة"');
  expect(html).toMatch(/bg-lime[^>]*>2<\/a>/);
  expect(html).toContain('أول سطر');
  expect(html).not.toContain('ثاني سطر');
  expect(html).toContain('مهام مستنياك');
  expect(render({ unread: 0 })).not.toContain('رسايل جديدة');
});
it('shows the voice preview with its time', () => {
  expect(render({ unread: 1, voice: true, createdAt: '2026-11-13T07:44:00Z' })).toContain('رسالة صوتية · 9:44');
});
it('shows the badge and preview on the workspace roster while retaining the player facts', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(PlayerRow, {
    player: { ...player, chat: { unread: 2, body: 'وصلت الرسالة\nسطر تاني', createdAt: '2026-11-13T07:44:00Z' } },
    today: '2026-11-13', hasFood: true, onArchive: () => undefined,
  })));
  expect(html).toContain('aria-label="2 رسايل جديدة"');
  expect(html).toContain('href="/captain/players/p/chat"');
  expect(html).toContain('وصلت الرسالة');
  expect(html).not.toContain('سطر تاني');
  expect(html).toContain('مهام مستنياك');
});
it('loads one counts query for the whole roster and associates the latest preview with each player', async () => {
  const requests: URL[] = [];
  const client = createClient<AppDatabase>('https://chat.test', 'key', { auth: { persistSession: false }, global: { fetch: async input => {
    const url = new URL(String(input)); requests.push(url);
    const rows = url.searchParams.get('select') === 'player_id' ? [{ player_id: 'p' }, { player_id: 'p' }, { player_id: 'q' }] : [
      { id: '3', player_id: 'p', body: 'latest', audio_path: null, created_at: '2026-11-13T10:00:00Z' },
      { id: '2', player_id: 'q', body: null, audio_path: 'q/voice', created_at: '2026-11-13T09:00:00Z' },
      { id: '1', player_id: 'p', body: 'old', audio_path: null, created_at: '2026-11-12T09:00:00Z' },
    ];
    return new Response(JSON.stringify(rows), { status: 200 });
  } } });
  const result = await loadRosterChat(client, 'c', ['p', 'q', 'r']);
  expect(result).toEqual({ p: { unread: 2, body: 'latest', voice: false, createdAt: '2026-11-13T10:00:00Z' },
    q: { unread: 1, body: null, voice: true, createdAt: '2026-11-13T09:00:00Z' }, r: { unread: 0 } });
  expect(requests.filter(url => url.searchParams.get('select') === 'player_id')).toHaveLength(1);
  expect(requests.every(url => url.searchParams.get('captain_id') === 'eq.c')).toBe(true);
});
it('finds another player beyond a full page of one busy conversation', async () => {
  const offsets: string[] = [];
  const client = createClient<AppDatabase>('https://chat.test', 'key', { auth: { persistSession: false }, global: { fetch: async input => {
    const url = new URL(String(input));
    if (url.searchParams.get('select') === 'player_id') return new Response('[]');
    const offset = url.searchParams.get('offset') ?? '0'; offsets.push(offset);
    const row = { id: 'a', player_id: offset === '0' ? 'p' : 'q', body: 'hello', audio_path: null, created_at: '2026-11-13T07:44:00Z' };
    return new Response(JSON.stringify(offset === '0' ? Array.from({ length: 1000 }, () => row) : [row]));
  } } });
  const result = await loadRosterChat(client, 'c', ['p', 'q']);
  expect(result.q?.body).toBe('hello');
  expect(offsets).toEqual(['0', '1000']);
});
it('surfaces query failure instead of presenting missing data as zero unread', async () => {
  const client = createClient<AppDatabase>('https://chat.test', 'key', { auth: { persistSession: false }, global: {
    fetch: async () => new Response(JSON.stringify({ message: 'unavailable' }), { status: 403 }),
  } });
  await expect(loadRosterChat(client, 'c', ['p'])).rejects.toMatchObject({ message: 'unavailable' });
});
