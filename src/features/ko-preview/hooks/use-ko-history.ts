import { useEffect, useRef, useState } from 'react';
import { answerSources } from '@/features/ko-core';
import type { AccountReply } from '@/features/ko-core';
import type { ActionState, ChatAction } from './use-ko-actions';

const retention = 7 * 86_400_000;
export const koHistoryLimit = 40;
const keyFor = (userId: string) => `kochivo.ko.chat.${userId}`;
type FinalState = { kind: 'done'; text: string } | { kind: 'failed'; text: string } | { kind: 'cancelled' } | { kind: 'expired' };
type SavedEntry = { id: string; speaker: 'user' | 'ko'; text: string; contextText?: string; timestamp: number;
  sources?: Extract<AccountReply, { kind: 'message' }>['sources'];
  actions?: { title: string; state: FinalState }[] };

// Hand-written checks keep zod (about 90 KiB) out of the KO client bundle.
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
function readState(value: unknown): FinalState | null {
  if (!isRecord(value)) return null;
  if (typeof value.text === 'string' && value.kind === 'done') return { kind: 'done', text: value.text };
  if (typeof value.text === 'string' && value.kind === 'failed') return { kind: 'failed', text: value.text };
  if (value.kind === 'cancelled') return { kind: 'cancelled' };
  return value.kind === 'expired' ? { kind: 'expired' } : null;
}
function readEntry(value: unknown, index: number): SavedEntry | null {
  if (!isRecord(value) || (value.speaker !== 'user' && value.speaker !== 'ko') || typeof value.text !== 'string'
    || typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)
    || (value.contextText !== undefined && typeof value.contextText !== 'string')) return null;
  if (value.actions !== undefined && !Array.isArray(value.actions)) return null;
  const actions: SavedEntry['actions'] = [];
  for (const item of Array.isArray(value.actions) ? value.actions : []) {
    const state = isRecord(item) && typeof item.title === 'string' ? readState(item.state) : null;
    if (!state || !isRecord(item) || typeof item.title !== 'string') return null;
    actions.push({ title: item.title, state });
  }
  const storedSources: unknown = value.sources;
  const sources = Array.isArray(storedSources) ? answerSources.filter(source => storedSources.includes(source)).slice(0, 4) : [];
  const id = typeof value.id === 'string' ? value.id : `legacy-${value.timestamp}-${index}`;
  return { id, speaker: value.speaker, text: value.text, timestamp: value.timestamp,
    ...(typeof value.contextText === 'string' && { contextText: value.contextText }),
    ...(sources.length && { sources }),
    ...(Array.isArray(value.actions) && { actions }) };
}
type Extras = Pick<Extract<AccountReply, { kind: 'message' }>, 'quick' | 'upgrade'>;
export type Entry = Omit<SavedEntry, 'actions'> & Extras & {
  actions?: (ChatAction & { restoredState?: FinalState })[];
};

function parseHistory(raw: string | null): SavedEntry[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.flatMap((item: unknown, index) => readEntry(item, index) ?? []) : [];
  } catch { return []; }
}

function mergeHistory<T extends Pick<SavedEntry, 'id' | 'timestamp'>>(first: T[], second: T[], now: number): T[] {
  const byId = new Map([...first, ...second].map(entry => [entry.id, entry]));
  return [...byId.values()].filter(entry => entry.timestamp >= now - retention)
    .sort((a, b) => a.timestamp - b.timestamp).slice(-koHistoryLimit);
}

export function loadKoHistory(userId: string, now: number): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = parseHistory(window.localStorage.getItem(keyFor(userId)));
    return mergeHistory([], stored, now).map(({ actions, ...entry }) =>
      ({ ...entry, actions: actions?.map(({ title, state }, position) => ({
        id: `restored-${entry.id}-${position}`, title, detail: '', restoredState: state,
        approval: { expiresAt: 0, expired: () => true, take: () => null },
      })) }));
  } catch { return []; }
}

export function saveKoHistory(userId: string, entries: Entry[], states: Record<string, ActionState>, now: number, requireExisting = false) {
  try {
    const storage = window.localStorage;
    const key = keyFor(userId);
    if (!entries.length) {
      storage.removeItem(key);
      return false;
    }
    // A different tab may have removed the chat before its storage event arrives.
    const raw = storage.getItem(key);
    if (requireExisting && raw === null) return false;
    const stored = parseHistory(raw);
    const storedIds = new Set(stored.map(entry => entry.id));
    const saved = entries.filter(entry => !storedIds.has(entry.id) ||
      entry.actions?.some(action => !action.restoredState)).map<SavedEntry>(({ id, speaker, text, contextText, timestamp, actions, sources }) => ({
      id, speaker, text, timestamp, contextText, sources,
      actions: actions?.map(({ id, title, restoredState }) => {
        const state = restoredState ?? states[id];
        return { title, state: state?.kind === 'done' || state?.kind === 'failed' ? { kind: state.kind, text: state.text }
          : { kind: state?.kind === 'cancelled' ? 'cancelled' : 'expired' } };
      }),
    }));
    const merged = JSON.stringify(mergeHistory(stored, saved, now));
    if (raw !== merged) storage.setItem(key, merged);
    return true;
  } catch { return false; }
}

export function useKoHistory(userId: string | undefined, states: Record<string, ActionState>, onClear: () => void, now = Date.now) {
  const [history, setHistory] = useState<Entry[]>(() => userId ? loadKoHistory(userId, now()) : []);
  const saved = useRef(history.length > 0);
  const generation = useRef(0);
  useEffect(() => {
    if (!userId || !history.length) return;
    const current = generation.current;
    const persist = () => {
      if (current === generation.current &&
          saveKoHistory(userId, history, states, now(), saved.current)) saved.current = true;
    };
    // Serialize read/merge/write between tabs when the browser supports Web Locks.
    if (window.navigator?.locks) void window.navigator.locks.request(keyFor(userId), persist).catch(persist);
    else persist();
  }, [userId, history, states, now]);

  useEffect(() => {
    if (!userId) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== keyFor(userId) && event.key !== null) return;
      if (event.newValue !== null) {
        const time = now();
        const stored = loadKoHistory(userId, time);
        const liveIds = new Set(stored.map(entry => entry.id));
        setHistory(previous => mergeHistory(stored, previous.filter(entry =>
          !liveIds.has(entry.id) || entry.quick || entry.upgrade ||
          entry.actions?.some(action => !action.restoredState)), time));
        return;
      }
      generation.current++;
      saved.current = false;
      setHistory([]);
      onClear();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId, onClear, now]);

  function clearHistory() {
    generation.current++;
    if (userId) saveKoHistory(userId, [], states, now());
    saved.current = false;
    setHistory([]);
    onClear();
  }

  return { history, setHistory, clearHistory };
}
