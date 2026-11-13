'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { listVoiceNotes, loadCaptainThreadReplies } from '@/features/voice-notes';
import { listMessages, markRead, sendText, sendVoice } from '../data/chat';
import { mergeThread } from '../thread';
import type { ChatMessage, ChatThreadItem, ChatThreadOptions, ChatTimer, VoiceInput } from '../types';

const clock = () => new Date();
const browserTimer: ChatTimer = {
  start: (tick, ms) => window.setInterval(tick, ms),
  stop: handle => window.clearInterval(handle as number),
};
type Pending = { item: ChatThreadItem; voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'> };
type Scope = { active: boolean; busy: boolean; pending: Map<string, Pending>; urls: Set<string> };
const scopeForThread = (): Scope => ({ active: true, busy: false, pending: new Map(), urls: new Set() });
const ordered = (items: ChatThreadItem[]) => items.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));

export function useChatThread({ playerId, captainId, viewerId, now = clock, intervalMs = 15000,
  timer = browserTimer, client }: ChatThreadOptions) {
  const scope = useRef<Scope>(scopeForThread());
  const [items, setItems] = useState<ChatThreadItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [readError, setReadError] = useState(false);
  const key = `${playerId}:${captainId}:${viewerId}`;
  const [threadKey, setThreadKey] = useState(key);
  if (threadKey !== key) {
    setThreadKey(key); setItems([]); setStatus('loading'); setReadError(false);
  }
  const getClient = useCallback(() => client ? Promise.resolve(client) : loadSupabaseBrowser(), [client]);

  const refresh = useCallback(async () => {
    const current = scope.current;
    if (!current.active || current.busy) return;
    current.busy = true;
    try {
      const db = await getClient();
      const [messages, voiceNotes, replies] = await Promise.all([
        listMessages(db, { playerId, captainId }), listVoiceNotes(db, playerId), loadCaptainThreadReplies(db, playerId),
      ]);
      if (!current.active) return;
      const loaded = mergeThread({ messages, voiceNotes, replies, playerId, captainId, viewerId });
      const loadedIds = new Set(loaded.map(item => item.id));
      for (const [id, pending] of current.pending) {
        if (loadedIds.has(id) && pending.item.status === 'sent') current.pending.delete(id);
      }
      setItems(ordered([...loaded, ...[...current.pending.values()].filter(pending => !loadedIds.has(pending.item.id)).map(pending => pending.item)]));
      setStatus('ready');
      const unread = messages.filter(item => item.senderId !== viewerId && !item.readAt).map(item => item.id);
      if (document.visibilityState === 'visible' && unread.length) {
        try {
          const readAt = now();
          await markRead(db, unread, readAt);
          if (!current.active) return;
          setItems(previous => previous.map(item => unread.includes(item.id) ? { ...item, readAt: readAt.toISOString() } : item));
          setReadError(false);
        } catch { if (current.active) setReadError(true); }
      }
    } catch { if (current.active) setStatus('error'); }
    finally { current.busy = false; }
  }, [playerId, captainId, viewerId, getClient, now]);

  useEffect(() => {
    const current = scopeForThread();
    scope.current = current;
    void refresh();
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
  return { items, status, readError, refresh, retry,
    sendText: (body: string) => send(body),
    sendVoice: (voice: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'>) => send(null, voice) };
}
