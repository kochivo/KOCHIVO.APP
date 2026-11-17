'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { listVoiceNotes, loadCaptainThreadReplies } from '@/features/voice-notes';
import { listMessages, markConversationRead, renewMessageAudio, sendText, sendVoice } from '../data/chat';
import { mergeThread } from '../thread';
import type { ChatMessage, ChatThreadItem, ChatThreadOptions, ChatTimer, VoiceInput } from '../types';

const clock = () => new Date();
const browserTimer: ChatTimer = {
  start: (tick, ms) => window.setInterval(tick, ms),
  stop: handle => window.clearInterval(handle as number),
};
type Pending = { item: ChatThreadItem; voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'> };
type Scope = { active: boolean; busy: boolean; olderBusy: boolean; cursor?: ChatMessage;
  messages: Map<string, ChatMessage>; pending: Map<string, Pending>; urls: Set<string> };
const scopeForThread = (): Scope => ({ active: true, busy: false, olderBusy: false,
  messages: new Map(), pending: new Map(), urls: new Set() });
const ordered = (items: ChatThreadItem[]) => items.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));

export function useChatThread({ playerId, captainId, viewerId, now = clock, intervalMs = 15000,
  timer = browserTimer, client }: ChatThreadOptions) {
  const scope = useRef<Scope>(scopeForThread());
  const [items, setItems] = useState<ChatThreadItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [readError, setReadError] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderStatus, setOlderStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const key = `${playerId}:${captainId}:${viewerId}`;
  const [threadKey, setThreadKey] = useState(key);
  if (threadKey !== key) {
    setThreadKey(key); setItems([]); setStatus('loading'); setReadError(false);
    setHasOlder(false); setOlderStatus('ready');
  }
  const getClient = useCallback(() => client ? Promise.resolve(client) : loadSupabaseBrowser(), [client]);

  const refresh = useCallback(async () => {
    const current = scope.current;
    if (!current.active || current.busy) return;
    current.busy = true;
    try {
      const db = await getClient();
      const [messages, voiceNotes, replies] = await Promise.all([
        listMessages(db, { playerId, captainId }, now()), listVoiceNotes(db, playerId, captainId), loadCaptainThreadReplies(db, playerId, captainId),
      ]);
      if (!current.active) return;
      let page = messages;
      while (current.messages.size && page.length === 50 && !page.some(message => current.messages.has(message.id))) {
        page = await listMessages(db, { playerId, captainId, before: page[0] }, now());
        if (!current.active) return;
        messages.unshift(...page);
      }
      if (!current.cursor) {
        current.cursor = messages[0];
        setHasOlder(messages.length === 50);
      }
      for (const message of messages) current.messages.set(message.id, message);
      const renewed = await renewMessageAudio(db, [...current.messages.values()], now());
      if (!current.active) return;
      for (const message of renewed) current.messages.set(message.id, message);
      const loaded = mergeThread({ messages: [...current.messages.values()], voiceNotes, replies, playerId, captainId, viewerId });
      const loadedIds = new Set(loaded.map(item => item.id));
      for (const [id, pending] of current.pending) {
        if (loadedIds.has(id) && pending.item.status === 'sent') current.pending.delete(id);
      }
      setItems(ordered([...loaded, ...[...current.pending.values()].filter(pending => !loadedIds.has(pending.item.id)).map(pending => pending.item)]));
      setStatus('ready');
      if (document.visibilityState === 'visible') {
        try {
          const readAt = now();
          await markConversationRead(db, { playerId, captainId, viewerId }, readAt);
          if (!current.active) return;
          for (const [id, message] of current.messages) {
            if (message.senderId !== viewerId && !message.readAt) current.messages.set(id, { ...message, readAt: readAt.toISOString() });
          }
          setItems(previous => previous.map(item => item.source === 'chat' && !item.mine && !item.readAt
            ? { ...item, readAt: readAt.toISOString() } : item));
          setReadError(false);
        } catch { if (current.active) setReadError(true); }
      }
    } catch { if (current.active) setStatus('error'); }
    finally { current.busy = false; }
  }, [playerId, captainId, viewerId, getClient, now]);

  const loadOlder = useCallback(async () => {
    const current = scope.current;
    if (!current.active || current.olderBusy || !current.cursor || !hasOlder) return;
    current.olderBusy = true; setOlderStatus('loading');
    try {
      const messages = await listMessages(await getClient(), { playerId, captainId, before: current.cursor }, now());
      if (!current.active) return;
      for (const message of messages) current.messages.set(message.id, message);
      current.cursor = messages[0] ?? current.cursor;
      const older = mergeThread({ messages, voiceNotes: [], replies: [], playerId, captainId, viewerId });
      setItems(previous => {
        const ids = new Set(previous.map(item => item.id));
        return ordered([...previous, ...older.filter(item => !ids.has(item.id))]);
      });
      setHasOlder(messages.length === 50); setOlderStatus('ready');
    } catch { if (current.active) setOlderStatus('error'); }
    finally { current.olderBusy = false; }
  }, [playerId, captainId, viewerId, getClient, hasOlder, now]);

  useEffect(() => {
    const current = scopeForThread();
    scope.current = current;
    void Promise.resolve().then(refresh);
    let handle: unknown;
    let running = false;
    const tick = () => { if (current.active && document.visibilityState === 'visible') void refresh(); };
    const stop = () => { if (running) timer.stop(handle); running = false; };
    const start = () => {
      if (!running && intervalMs > 0 && document.visibilityState === 'visible') {
        handle = timer.start(tick, intervalMs); running = true;
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') { tick(); start(); } else stop();
    };
    start();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      current.active = false; stop();
      document.removeEventListener('visibilitychange', visibility);
      for (const url of current.urls) URL.revokeObjectURL(url);
    };
  }, [refresh, timer, intervalMs]);

  const persist = useCallback(async (pending: Pending, current: Scope): Promise<boolean> => {
    if (!current.active) return false;
    pending.item = { ...pending.item, status: 'sending' };
    setItems(previous => ordered([...previous.filter(item => item.id !== pending.item.id), pending.item]));
    try {
      const db = await getClient();
      const input = { id: pending.item.id, playerId, captainId, senderId: viewerId };
      const saved: ChatMessage = pending.voice ? await sendVoice(db, { ...input, ...pending.voice })
        : await sendText(db, { ...input, body: pending.item.body ?? '' });
      if (!current.active) return true;
      pending.item = { ...pending.item, ...saved, url: saved.url ?? pending.item.url, status: 'sent' };
      setItems(previous => ordered([...previous.filter(item => item.id !== saved.id), pending.item]));
      return true;
    } catch {
      if (current.active) {
        pending.item = { ...pending.item, status: 'failed' };
        setItems(previous => previous.map(item => item.id === pending.item.id ? pending.item : item));
      }
      return false;
    }
  }, [playerId, captainId, viewerId, getClient]);

  const send = useCallback((body: string | null, voice?: Pending['voice']) => {
    const current = scope.current;
    if (!current.active) return Promise.resolve(false);
    const id = uuidv7();
    const url = voice ? URL.createObjectURL(voice.blob) : undefined;
    if (url) current.urls.add(url);
    const item: ChatThreadItem = { id, playerId, captainId, senderId: viewerId, body: body?.trim() ?? null,
      audioPath: voice ? `${playerId}/chat/${id}` : null, durationSeconds: voice?.durationSeconds ?? null,
      readAt: null, createdAt: now().toISOString(), url, source: 'chat', kind: voice ? 'voice' : 'text', mine: true, status: 'sending' };
    const pending = { item, voice };
    current.pending.set(id, pending);
    return persist(pending, current);
  }, [playerId, captainId, viewerId, now, persist]);

  const retry = useCallback((id: string) => {
    const current = scope.current;
    const pending = current.pending.get(id);
    return pending?.item.status === 'failed' ? persist(pending, current) : Promise.resolve(false);
  }, [persist]);
  return { items, status, readError, refresh, retry, hasOlder, olderStatus, loadOlder,
    sendText: (body: string) => send(body),
    sendVoice: (voice: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'>) => send(null, voice) };
}
