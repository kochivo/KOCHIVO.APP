import type * as React from 'react';
import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppDatabase } from '@/types/app-database';
import { mergeThread } from './thread';
import { listMessages, markRead, markConversationRead, sendText, sendVoice, unreadCounts } from './data/chat';
import { useChatThread } from './hooks/use-chat-thread';
import type { ChatMessage, ChatTimer } from './types';
const lifecycle = vi.hoisted(() => ({
  refs: [] as { current: unknown }[], states: [] as unknown[], refIndex: 0, stateIndex: 0,
  effects: [] as (() => (() => void) | undefined)[], collect: true,
}));
vi.mock('react', async original => ({
  ...await original<typeof React>(), useCallback: (fn: unknown) => fn,
  useRef: (value: unknown) => {
    const i = lifecycle.refIndex++; lifecycle.refs[i] ??= { current: value }; return lifecycle.refs[i];
  },
  useState: (value: unknown) => {
    const i = lifecycle.stateIndex++;
    if (!(i in lifecycle.states)) lifecycle.states[i] = typeof value === 'function' ? value() : value;
    return [lifecycle.states[i], (next: unknown) => {
      lifecycle.states[i] = typeof next === 'function' ? next(lifecycle.states[i]) : next;
    }];
  },
  useEffect: (effect: () => (() => void) | undefined) => { if (lifecycle.collect) lifecycle.effects.push(effect); },
}));
const date = '2026-11-13T10:00:00.000Z';
let currentTime = date;
const now = () => new Date(currentTime);
const player = '01900000-0000-7000-8000-000000000001';
const captain = '01900000-0000-7000-8000-000000000002';
const wire: AppDatabase['public']['Tables']['chat_messages']['Row'] = { id: 'm', player_id: player, captain_id: captain, sender_id: captain,
  body: 'hello', audio_path: null, duration_seconds: null, read_at: null, created_at: date };
const message: ChatMessage = { id: 'm', playerId: player, captainId: captain, senderId: captain,
  body: 'hello', audioPath: null, durationSeconds: null, readAt: null, createdAt: date };
const requests: { url: URL; method: string; body: unknown }[] = [];
let rows: typeof wire[];
let failInsert: boolean;
let failRead: boolean;
let failLoad: boolean;
let insertGate: Promise<void> | undefined;
let olderPages: (typeof wire[])[] = [];
const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input)); const method = init?.method ?? 'GET';
  const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
  requests.push({ url, method, body });
  if (url.pathname.endsWith('/rpc/read_chat_conversation')) return new Response(failRead ? '{"message":"failed"}' : '', { status: failRead ? 403 : 200 });
  if (url.pathname.includes('/storage/')) return new Response(JSON.stringify(
    url.pathname.includes('/sign/') ? [{ path: `${player}/chat/a.webm`, signedURL: '/signed' }] : { Key: 'uploaded' }), { status: 200 });
  if (url.pathname.endsWith('/chat_messages')) {
    if ((method === 'GET' && failLoad) || (method === 'PATCH' && failRead)) return new Response(JSON.stringify({ message: 'failed' }), { status: 403 });
    if (method === 'POST') {
      await insertGate;
      if (failInsert) return new Response(JSON.stringify({ message: 'denied', code: '42501' }), { status: 403 });
      return new Response(JSON.stringify({ ...wire, body: null, ...(body as object) }), { status: 201 });
    }
    return new Response(JSON.stringify(method === 'PATCH' ? [] : url.searchParams.has('or') && olderPages.length ? olderPages.shift() : rows), { status: 200 });
  }
  return new Response('[]', { status: 200 });
};
const client = createClient<AppDatabase>('https://chat.test', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: fetcher },
});
const listeners = new Map<string, () => void>();
let visible: string;
let tick: (() => void) | undefined;
const stop = vi.fn();
const timer: ChatTimer = { start: (fn, ms) => { expect(ms).toBe(15000); tick = fn; return 7; }, stop };
const useTestThread = () => {
  return useChatThread({ playerId: player, captainId: captain, viewerId: player, client, now, timer });
};
const render = (hook = useTestThread) => {
  lifecycle.refIndex = 0; lifecycle.stateIndex = 0;
  return hook();
};
const settle = async () => { for (let i = 0; i < 120; i++) await Promise.resolve(); };
beforeEach(() => {
  currentTime = date;
  requests.length = 0; rows = []; failInsert = false; failRead = false; failLoad = false; insertGate = undefined;
  olderPages = [];
  lifecycle.refs = []; lifecycle.states = []; lifecycle.effects = []; lifecycle.collect = true;
  listeners.clear(); visible = 'visible'; tick = undefined; stop.mockClear();
  vi.stubGlobal('document', { get visibilityState() { return visible; },
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name) });
});
afterEach(() => vi.unstubAllGlobals());
it('merges all real sources chronologically with stable ids and viewer ownership', () => {
  const input = { messages: [message, { ...message, id: 'mine', senderId: player, createdAt: '2026-11-13T12:00:00+02:00' }],
    voiceNotes: [{ id: 'm', url: '/audio', durationSeconds: 12, listenedAt: null,
      createdAt: '2026-11-13T09:00:00Z', contextId: null }],
    replies: [{ id: 'r', captain_reply: 'reply', reviewed_at: '2026-11-13T11:00:00Z' },
      { id: 'empty', captain_reply: ' ', reviewed_at: date }], playerId: player, captainId: captain, viewerId: player };
  const thread = mergeThread(input);
  expect(thread.map(item => [item.id, item.mine])).toEqual([
    ['voice:m', false], ['m', false], ['mine', true], ['reply:r', false],
  ]);
  expect(mergeThread({ ...input, viewerId: captain }).map(item => item.mine)).toEqual([true, true, false, true]);
  expect(input.messages[0]).toBe(message);
  expect(thread.find(item => item.id === 'reply:r')?.readAt).toBeNull();
});

it('loads the newest bounded page in chronological order and filters both participants', async () => {
  rows = [{ ...wire, id: 'new', created_at: '2026-11-13T11:00:00Z' }, wire];
  expect((await listMessages(client, { playerId: player, captainId: captain })).map(row => row.id)).toEqual(['m', 'new']);
  expect(requests[0]?.url.searchParams.get('limit')).toBe('50');
  expect(requests[0]?.url.searchParams.get('player_id')).toBe(`eq.${player}`);
  expect(requests[0]?.url.searchParams.get('captain_id')).toBe(`eq.${captain}`);
});

it('uses a stable timestamp and id cursor for older messages', async () => {
  await listMessages(client, { playerId: player, captainId: captain, before: { createdAt: date, id: captain } });
  expect(requests[0]?.url.searchParams.get('or')).toBe(`(created_at.lt.${date},and(created_at.eq.${date},id.lt.${captain}))`);
});

it('loads older pages, preserves them through polls, and exposes retryable page errors', async () => {
  rows = Array.from({ length: 50 }, (_, i) => ({ ...wire, id: String(100 - i) }));
  render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false; await settle();
  expect(render().hasOlder).toBe(true);
  failLoad = true; await render().loadOlder();
  expect(render().olderStatus).toBe('error');
  failLoad = false; rows = [{ ...wire, id: 'old', created_at: '2026-11-12T10:00:00Z', audio_path: `${player}/chat/a.webm` }];
  await render().loadOlder();
  expect(render().hasOlder).toBe(false);
  const oldUrl = render().items.find(item => item.id === 'old')?.url;
  currentTime = '2026-11-13T11:00:00Z'; requests.length = 0;
  rows = [wire]; await render().refresh();
  expect(render().items.some(item => item.id === 'old')).toBe(true);
  expect(render().items.find(item => item.id === 'old')).toMatchObject({ url: oldUrl, readAt: now().toISOString(), urlExpiresAt: now().getTime() + 3600_000 });
  expect(requests.some(request => request.url.pathname.includes('/sign/'))).toBe(true);
  cleanup?.();
});

it('fills the gap when more than a page arrives between visible polls', async () => {
  rows = [wire]; render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false; await settle();
  rows = Array.from({ length: 50 }, (_, i) => ({ ...wire, id: `new${i}`, created_at: '2026-11-14T10:00:00Z' }));
  olderPages = [[{ ...wire, id: 'gap', created_at: '2026-11-14T09:00:00Z' }, wire]];
  await render().refresh();
  expect(render().items).toHaveLength(52);
  expect(render().items.some(item => item.id === 'gap')).toBe(true); cleanup?.();
});

it('trims text, supplies a uuid, and rejects empty or oversized input before sending', async () => {
  const result = await sendText(client, { playerId: player, captainId: captain, senderId: player, body: ' hi ' });
  expect(result.body).toBe('hi'); expect(result.id).toMatch(/^[\da-f-]{14}7/);
  const count = requests.length;
  for (const body of [' ', 'x'.repeat(1001)]) await expect(sendText(client,
    { playerId: player, captainId: captain, senderId: player, body })).rejects.toThrow();
  expect(requests).toHaveLength(count);
});

it('uploads voice with a bare MIME type into chat and removes it if insertion fails', async () => {
  failInsert = true;
  await expect(sendVoice(client, { playerId: player, captainId: captain, senderId: player,
    blob: new Blob(['voice']), mimeType: 'audio/webm;codecs=opus', durationSeconds: 12 })).rejects.toThrow();
  const upload = requests.find(r => r.method === 'POST' && r.url.pathname.includes('/storage/'));
  expect(upload?.url.pathname).toMatch(new RegExp(`/voice-notes/${player}/chat/[\\da-f-]+\\.webm$`));
  expect(requests.find(r => r.method === 'DELETE')?.body).toMatchObject({ prefixes: [expect.stringContaining('/chat/')] });
});

it('marks only unread ids and counts incoming messages in one query', async () => {
  await markRead(client, [], now()); expect(requests).toHaveLength(0);
  await markRead(client, ['m'], now());
  expect(requests[0]?.body).toEqual({ read_at: date });
  expect(requests[0]?.url.searchParams.get('read_at')).toBe('is.null');
  rows = [wire, wire]; requests.length = 0;
  expect(await unreadCounts(client, captain)).toEqual({ [player]: 2 });
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url.searchParams.get('sender_id')).toBe(`neq.${captain}`);
});

it('marks the whole conversation and matching bell item even when the latest page is empty', async () => {
  await markConversationRead(client, { playerId: player, captainId: captain, viewerId: player }, now());
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url.pathname).toContain('/rpc/read_chat_conversation');
  expect(requests[0]?.body).toEqual({ p_player_id: player, p_captain_id: captain, p_read_at: date });
});

it('loads and marks incoming messages, stops polling while hidden, resumes and cleans up', async () => {
  rows = [wire]; render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false;
  await settle();
  expect(render().items[0]).toMatchObject({ id: 'm', mine: false, readAt: date });
  expect(requests.some(r => r.url.pathname.endsWith('/rpc/read_chat_conversation'))).toBe(true);
  const previous = requests.length;
  visible = 'hidden'; listeners.get('visibilitychange')?.(); tick?.(); await settle();
  expect(requests).toHaveLength(previous); expect(stop).toHaveBeenCalledWith(7);
  visible = 'visible'; listeners.get('visibilitychange')?.(); await settle();
  expect(requests.length).toBeGreaterThan(previous);
  cleanup?.(); expect(listeners.size).toBe(0);
  const count = requests.length; tick?.(); await settle(); expect(requests).toHaveLength(count);
});

it('shows optimistic sends immediately, keeps failed sends through polls and retries the same id', async () => {
  let hook = render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false; await settle();
  let release: (() => void) | undefined; insertGate = new Promise<void>(resolve => { release = resolve; });
  failInsert = true; const sending = hook.sendText('hi');
  hook = render(); expect(hook.items[0]).toMatchObject({ body: 'hi', mine: true, status: 'sending' });
  const messageId = hook.items[0]?.id; release?.(); await sending; await settle();
  expect(render().items[0]?.status).toBe('failed');
  await hook.refresh(); expect(render().items[0]?.status).toBe('failed');
  failInsert = false; insertGate = undefined; await render().retry(messageId ?? '');
  expect(render().items[0]).toMatchObject({ id: messageId, status: 'sent' });
  expect(requests.filter(r => r.method === 'POST' && r.url.pathname.endsWith('/chat_messages')).map(r => (r.body as { id: string }).id)).toEqual([messageId, messageId]);
  cleanup?.();
});

it('loads in a hidden tab without marking read or starting the timer until shown', async () => {
  visible = 'hidden'; rows = [wire]; render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false;
  await settle(); expect(render().items[0]?.readAt).toBeNull(); expect(tick).toBeUndefined();
  expect(requests.some(r => r.method === 'PATCH')).toBe(false);
  visible = 'visible'; listeners.get('visibilitychange')?.(); await settle();
  expect(tick).toBeDefined(); expect(render().items[0]?.readAt).toBe(date); cleanup?.();
});

it('keeps loaded content on read failure and retries receipts on the next visible poll', async () => {
  rows = [wire]; failRead = true; render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false;
  await settle(); expect(render()).toMatchObject({ status: 'ready', readError: true });
  expect(render().items[0]?.readAt).toBeNull();
  failRead = false; tick?.(); await settle(); expect(render().readError).toBe(false); cleanup?.();
});

it('exposes load failures for retry and never marks the viewer’s own messages read', async () => {
  failLoad = true; render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false;
  await settle(); expect(render().status).toBe('error');
  failLoad = false; rows = [{ ...wire, sender_id: player }]; await render().refresh();
  expect(render().status).toBe('ready');
  expect(render().items[0]?.readAt).toBeNull(); cleanup?.();
});

it('does not update a disposed thread after a delayed send completes', async () => {
  const hook = render(); const cleanup = lifecycle.effects[0]?.(); lifecycle.collect = false; await settle();
  let release: (() => void) | undefined; insertGate = new Promise<void>(resolve => { release = resolve; });
  const sending = hook.sendText('hi'); await settle(); cleanup?.();
  const previous = [...lifecycle.states]; release?.(); await sending; await settle();
  expect(lifecycle.states).toEqual(previous);
});

it('signs saved voice messages and rejects invalid recordings before any upload', async () => {
  rows = [{ ...wire, body: null, audio_path: `${player}/chat/a.webm`, duration_seconds: 12 }];
  expect((await listMessages(client, { playerId: player, captainId: captain }))[0]?.url).toContain('/signed');
  requests.length = 0;
  const input = { playerId: player, captainId: captain, senderId: player, blob: new Blob(['voice']), mimeType: 'audio/webm', durationSeconds: 12 };
  for (const patch of [{ durationSeconds: 0 }, { durationSeconds: 121 }, { durationSeconds: 1.5 }, { mimeType: 'image/png' },
    { blob: new Blob([new Uint8Array(2097153)]) }]) await expect(sendVoice(client, { ...input, ...patch })).rejects.toThrow();
  expect(requests).toHaveLength(0);
  const result = await sendVoice(client, input);
  expect(result).toMatchObject({ body: null, durationSeconds: 12, audioPath: expect.stringContaining(`${player}/chat/`) });
});
